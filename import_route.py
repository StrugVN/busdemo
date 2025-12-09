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
    """
    Load basic route info from {route_code}_info.json.
    """
    path = os.path.join(base_dir, f"{route_code}_info.json")
    with open(path, "r", encoding="utf-8") as f:
        obj = json.load(f)

    records = obj.get("data", [])
    if not records:
        raise ValueError(f"No 'data' entries found in {path}")

    row = records[0]
    ma_tuyen = row["MaTuyenXe"]
    ten_tuyen = row["TenHanhTrinh"]
    return ma_tuyen, ten_tuyen


# ---------- Geometry helpers ----------

def load_full_merged_points(route_code, base_dir="."):
    """
    Read {MaTuyen}_path.json and concatenate all path segments in order.

    Returns:
        flat_points: list of (x, y) in Mercator coordinates, ordered along the path.
    """
    path_file = os.path.join(base_dir, f"{route_code}_path.json")
    with open(path_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    features = data.get("features", [])
    if not features:
        raise ValueError("No features in path json")

    geom = features[0].get("geometry", {})
    paths = geom.get("paths", [])
    if not paths:
        raise ValueError("Empty 'paths' list")

    print(f"Found {len(paths)} path segments")
    
    # Concatenate all paths in order
    flat_points = []
    for idx, path_coords in enumerate(paths):
        print(f"  Segment {idx}: {len(path_coords)} points")
        if len(path_coords) < 2:
            continue
        
        for x, y in path_coords:
            pt = (x, y)
            # Skip immediate duplicates
            if flat_points and flat_points[-1] == pt:
                continue
            flat_points.append(pt)
    
    print(f"Total points after concatenation: {len(flat_points)}")

    if len(flat_points) < 2:
        raise ValueError("Not enough points after concatenation")

    return flat_points


def trim_path_to_two_stations(flat_points, station_xy):
    """
    Given:
      - flat_points: list of (x, y) along merged line (in Mercator)
      - station_xy: [(x1,y1), (x2,y2)] for the 2 terminal stations (also Mercator)

    Find nearest vertex in flat_points to each station, ensure order is station1->station2,
    and return the sublist between them (inclusive).

    This keeps internal loops between them but drops bits before start / after end.
    """

    def nearest_index(target_xy, pts):
        tx, ty = target_xy
        best_i = None
        best_d2 = float("inf")
        for i, (x, y) in enumerate(pts):
            dx = x - tx
            dy = y - ty
            d2 = dx * dx + dy * dy
            if d2 < best_d2:
                best_d2 = d2
                best_i = i
        return best_i, best_d2

    (sx1, sy1), (sx2, sy2) = station_xy

    i1, d1 = nearest_index((sx1, sy1), flat_points)
    i2, d2 = nearest_index((sx2, sy2), flat_points)

    print(f"Station 1 ({sx1:.2f}, {sy1:.2f}) -> index {i1}, distance {d1**0.5:.2f}m")
    print(f"Station 2 ({sx2:.2f}, {sy2:.2f}) -> index {i2}, distance {d2**0.5:.2f}m")
    print(f"Total points in path: {len(flat_points)}")

    # If we somehow failed, just return original
    if i1 is None or i2 is None:
        print("Warning: Could not find nearest points, returning full path")
        return flat_points

    # Check if distances are reasonable (within 1km)
    if d1**0.5 > 1000 or d2**0.5 > 1000:
        print(f"Warning: Station(s) very far from path (d1={d1**0.5:.0f}m, d2={d2**0.5:.0f}m)")
        print("Returning full path without trimming")
        return flat_points

    # Ensure i1 <= i2
    if i1 > i2:
        i1, i2 = i2, i1
        print(f"Swapped indices: now i1={i1}, i2={i2}")

    # Slice inclusive between the two stations
    sub = flat_points[i1 : i2 + 1]
    print(f"Trimmed path: {len(sub)} points (from index {i1} to {i2})")
    
    if len(sub) < 2:
        print("Warning: Trimmed path too short, returning full path")
        return flat_points

    return sub


def points_to_linestring_wkt(points):
    """
    Convert a list of (x,y) Mercator points to a WKT LINESTRING in WGS84.
    """
    if len(points) < 2:
        raise ValueError("Not enough points to build LINESTRING")

    wgs = []
    for x, y in points:
        lon, lat = mercator_to_wgs84(x, y)
        wgs.append(f"{lon} {lat}")

    return "LINESTRING(" + ", ".join(wgs) + ")"


# ---------- Station / stops ----------

def load_stations(route_code, base_dir="."):
    """
    Load stations from {MaTuyen}_diemdung.json.

    For now: we read all features but you mainly care about the first two
    as terminal stations.

    Each stop dict has:
      MaTram, TenTram, mx, my, lng, lat, MaLoai
    """
    path = os.path.join(base_dir, f"{route_code}_diemdung.json")
    if not os.path.exists(path):
        return []

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    feats = data.get("features", [])
    stops = []

    for i, feat in enumerate(feats):
        geom = feat.get("geometry", {})
        x = geom.get("x")
        y = geom.get("y")
        if x is None or y is None:
            continue

        lon, lat = mercator_to_wgs84(x, y)
        ten_tram = feat.get("attributes", {}).get("TenDiemDung") or f"Trạm {route_code}_{i+1:03d}"

        stops.append(
            {
                "MaTram": f"{route_code}_{i+1:03d}",
                "TenTram": ten_tram,
                "mx": x,
                "my": y,
                "lng": lon,
                "lat": lat,
                "MaLoai": 1 if i < 2 else 2,  # treat first two as stations by default
            }
        )

    return stops


# ---------- Main import logic ----------

def import_route(route_code, base_dir=".", station_order="path-first"):
    ma_tuyen, ten_tuyen = load_info(route_code, base_dir)
    print(f"Route {ma_tuyen} - {ten_tuyen}")

    # 1) Geometry: merged full path (Mercator)
    full_points = load_full_merged_points(route_code, base_dir)

    # 2) Stations / stops (for both geometry trim & tram_dung)
    stops = load_stations(route_code, base_dir)
    print(f"Stops loaded: {len(stops)}")

    # 3) Build Path (forward) and Path_Nguoc using station order
    if len(stops) >= 2:
        # choose which station is forward start vs backward start
        if station_order == "path-first":
            forward_idx = 0       # stops[0] is Path start
            backward_idx = 1      # stops[1] is Path_Nguoc start
        else:  # 'nguoc-first'
            forward_idx = 1       # stops[1] is Path start
            backward_idx = 0      # stops[0] is Path_Nguoc start

        stationA_xy = (stops[forward_idx]["mx"], stops[forward_idx]["my"])
        stationB_xy = (stops[backward_idx]["mx"], stops[backward_idx]["my"])

        trimmed_forward_points = trim_path_to_two_stations(
            full_points,
            [stationA_xy, stationB_xy],
        )
    else:
        trimmed_forward_points = full_points

    trimmed_backward_points = list(reversed(trimmed_forward_points))

    path_wkt = points_to_linestring_wkt(trimmed_forward_points)
    path_nguoc_wkt = points_to_linestring_wkt(trimmed_backward_points)

    # 4) DB work
    conn = mysql.connector.connect(**DB_CONFIG)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # 4.1) Insert/Update tuyen_bus with both Path and Path_Nguoc
        sql_route = """
            INSERT INTO tuyen_bus (MaTuyen, TenTuyen, Path, Path_Nguoc)
            VALUES (%s, %s, ST_GeomFromText(%s), ST_GeomFromText(%s))
            ON DUPLICATE KEY UPDATE
                TenTuyen   = VALUES(TenTuyen),
                Path       = VALUES(Path),
                Path_Nguoc = VALUES(Path_Nguoc)
        """
        cur.execute(sql_route, (ma_tuyen, ten_tuyen, path_wkt, path_nguoc_wkt))

        # 4.2) Insert/Update tram_dung
        for stop in stops:
            sql_stop = """
                INSERT INTO tram_dung (MaTram, TenTram, KinhDo, ViDo, MaLoai)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    TenTram = VALUES(TenTram),
                    KinhDo  = VALUES(KinhDo),
                    ViDo    = VALUES(ViDo),
                    MaLoai  = VALUES(MaLoai)
            """
            cur.execute(
                sql_stop,
                (
                    stop["MaTram"],
                    stop["TenTram"],
                    stop["lng"],   # WGS84 lon
                    stop["lat"],   # WGS84 lat
                    stop.get("MaLoai", 2),
                ),
            )

        # 4.3) Rebuild tuyen_tram entries for this route
        cur.execute("DELETE FROM tuyen_tram WHERE MaTuyen = %s", (ma_tuyen,))

        if len(stops) >= 2:
            # Special case: use first two as start stations of each direction.
            # Convention:
            #  if station_order == 'path-first':
            #     stops[0] -> Chieu = 0 (Path), STT = 1
            #     stops[1] -> Chieu = 1 (Path_Nguoc), STT = 1
            #  if 'nguoc-first':
            #     stops[1] -> Chieu = 0 (Path), STT = 1
            #     stops[0] -> Chieu = 1 (Path_Nguoc), STT = 1
            if station_order == "path-first":
                idx_path = 0
                idx_nguoc = 1
            else:
                idx_path = 1
                idx_nguoc = 0

            sql_tt = """
                INSERT INTO tuyen_tram (MaTuyen, MaTram, STT, KhoangCachDenTramTiepTheo, Chieu)
                VALUES (%s, %s, %s, NULL, %s)
                ON DUPLICATE KEY UPDATE
                    STT   = VALUES(STT),
                    Chieu = VALUES(Chieu)
            """

            # Path (Chieu = 0)
            cur.execute(sql_tt, (ma_tuyen, stops[idx_path]["MaTram"], 1, 0))
            # Path_Nguoc (Chieu = 1)
            cur.execute(sql_tt, (ma_tuyen, stops[idx_nguoc]["MaTram"], 1, 1))

        else:
            # Fallback: if we had only 1 or 0 stops, we won't rebuild tuyen_tram here.
            pass

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
    parser.add_argument(
        "--station-order",
        choices=["path-first", "nguoc-first"],
        default="path-first",
        help="diemdung.json order: [Path_start, PathNguoc_start] (path-first) "
             "or [PathNguoc_start, Path_start] (nguoc-first).",
    )

    args = parser.parse_args()
    import_route(args.route, args.dir, args.station_order)


if __name__ == "__main__":
    main()