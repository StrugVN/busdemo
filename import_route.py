import os
import json
import math
import argparse
import mysql.connector

# ============== CONFIG: change to your DB credentials ==================
DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "",
    "database": "geo_bus",
}
# ======================================================================


def mercator_to_wgs84(x, y):
    """
    Convert Web Mercator (EPSG:3857) to WGS84 lon/lat.
    x, y are in meters.
    """
    R = 6378137.0
    lon = (x / R) * 180.0 / math.pi
    lat = (2 * math.atan(math.exp(y / R)) - math.pi / 2) * 180.0 / math.pi
    return lon, lat


def load_info(route_code, base_dir="."):
    path = os.path.join(base_dir, f"{route_code}_info.json")
    with open(path, "r", encoding="utf-8") as f:
        obj = json.load(f)

    # obj is a dict: {"status": "success", "data": [ {...} ]}
    records = obj.get("data", [])
    if not records:
        raise ValueError(f"No 'data' entries found in {path}")

    row = records[0]
    ma_tuyen = row["MaTuyenXe"]
    ten_tuyen = row["TenHanhTrinh"]
    return ma_tuyen, ten_tuyen



def load_path_wkt(route_code, base_dir="."):
    """
    Read {MaTuyen}_path.json but extract the REAL route path
    by selecting the longest polyline and ignoring decorative circles.
    """
    path = os.path.join(base_dir, f"{route_code}_path.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    features = data.get("features", [])
    if not features:
        raise ValueError("No features in path json")

    paths = features[0]["geometry"]["paths"]
    if not paths:
        raise ValueError("Empty 'paths' list")

    # Convert each path to WGS84 and compute length
    longest_path = None
    longest_dist = -1

    for path_coords in paths:
        wgs_points = []
        dist = 0.0

        prev_lon = prev_lat = None

        for x, y in path_coords:
            lon, lat = mercator_to_wgs84(x, y)
            wgs_points.append((lon, lat))

            # compute incremental distance
            if prev_lon is not None:
                dx = lon - prev_lon
                dy = lat - prev_lat
                dist += math.hypot(dx, dy)

            prev_lon, prev_lat = lon, lat

        # choose longest
        if dist > longest_dist:
            longest_dist = dist
            longest_path = wgs_points

    # build WKT for the *real* route line
    coord_str = ", ".join(f"{lon} {lat}" for lon, lat in longest_path)
    wkt = f"LINESTRING ({coord_str})"

    return wkt



def load_stops(route_code, base_dir="."):
    """
    Read {MaTuyen}_diemdung.json and return list of stops:
    [
      {
        "MaTram": "11_001",
        "TenTram": "...",
        "KinhDo": <lon>,
        "ViDo": <lat>,
        "STT": 1,
      },
      ...
    ]
    """
    path = os.path.join(base_dir, f"{route_code}_diemdung.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    stops = []
    for i, feat in enumerate(data["features"], start=1):
        name = feat["attributes"]["TenDiemDung"]
        x = feat["geometry"]["x"]
        y = feat["geometry"]["y"]
        lon, lat = mercator_to_wgs84(x, y)
        ma_tram = f"{route_code}_{i:03d}"

        stops.append(
            {
                "MaTram": ma_tram,
                "TenTram": name,
                "KinhDo": lon,
                "ViDo": lat,
                "STT": i,
            }
        )

    return stops


def import_route(route_code, base_dir="."):
    ma_tuyen, ten_tuyen = load_info(route_code, base_dir)
    path_wkt = load_path_wkt(route_code, base_dir)
    stops = load_stops(route_code, base_dir)

    print(f"Route {ma_tuyen} - {ten_tuyen}")
    print(f"Stops: {len(stops)}")

    conn = mysql.connector.connect(**DB_CONFIG)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # 1) Insert/Update tuyen_bus
        sql_route = """
            INSERT INTO tuyen_bus (MaTuyen, TenTuyen, Path)
            VALUES (%s, %s, ST_GeomFromText(%s))
            ON DUPLICATE KEY UPDATE
                TenTuyen = VALUES(TenTuyen),
                Path = VALUES(Path)
        """
        cur.execute(sql_route, (ma_tuyen, ten_tuyen, path_wkt))

        # 2) Insert/Update tram_dung
        # 2) Insert/Update tram_dung
        for stop in stops:
            sql_stop = """
                INSERT INTO tram_dung (MaTram, TenTram, KinhDo, ViDo, MaLoai)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    TenTram = VALUES(TenTram),
                    KinhDo = VALUES(KinhDo),
                    ViDo   = VALUES(ViDo),
                    MaLoai = VALUES(MaLoai)
            """
            cur.execute(
                sql_stop,
                (
                    stop["MaTram"],
                    stop["TenTram"],
                    stop["KinhDo"],
                    stop["ViDo"],
                    stop.get("MaLoai", 2),  # default to type 2 if missing
                ),
            )


        # 3) Rebuild tuyen_tram entries for this route
        cur.execute("DELETE FROM tuyen_tram WHERE MaTuyen = %s", (ma_tuyen,))

        # 3) Insert into tuyen_tram
        if len(stops) == 2:
            # Special case: two terminal stations, each is start of one direction.
            # Convention (per your note):
            #  - first stop  -> Chieu = 1, STT = 1
            #  - second stop -> Chieu = 0, STT = 1
            station1 = stops[0]
            station2 = stops[1]

            sql_tt = """
                INSERT INTO tuyen_tram (MaTuyen, MaTram, STT, KhoangCachDenTramTiepTheo, Chieu)
                VALUES (%s, %s, %s, NULL, %s)
                ON DUPLICATE KEY UPDATE
                    STT   = VALUES(STT),
                    Chieu = VALUES(Chieu)
            """

            # first feature -> Chieu = 1, STT = 1
            cur.execute(sql_tt, (ma_tuyen, station1["MaTram"], 1, 1))

            # second feature -> Chieu = 0, STT = 1
            cur.execute(sql_tt, (ma_tuyen, station2["MaTram"], 1, 0))

        else:
            # Default behavior for routes where diemdung contains the whole sequence
            sql_tt = """
                INSERT INTO tuyen_tram (MaTuyen, MaTram, STT, KhoangCachDenTramTiepTheo, Chieu)
                VALUES (%s, %s, %s, NULL, %s)
                ON DUPLICATE KEY UPDATE
                    STT   = VALUES(STT),
                    Chieu = VALUES(Chieu)
            """
            for idx, stop in enumerate(stops):
                cur.execute(sql_tt, (ma_tuyen, stop["MaTram"], idx + 1, 0))


        conn.commit()
        print("✅ Import done, transaction committed.")

    except Exception as e:
        conn.rollback()
        print("❌ Error, transaction rolled back.")
        raise e
    finally:
        cur.close()
        conn.close()


def main():
    parser = argparse.ArgumentParser(
        description="Import bus route JSON (info/path/diemdung) into geo_bus DB."
    )
    parser.add_argument(
        "--route",
        required=True,
        help="MaTuyen (e.g. 11 if files are 11_info.json, 11_path.json, 11_diemdung.json)",
    )
    parser.add_argument(
        "--dir",
        default=".",
        help="Directory where the JSON files live (default: current directory)",
    )
    args = parser.parse_args()

    import_route(args.route, args.dir)


if __name__ == "__main__":
    main()
