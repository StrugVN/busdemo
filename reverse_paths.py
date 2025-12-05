import mysql.connector
from shapely import wkt
from shapely.geometry import LineString, MultiLineString

# ============ CONFIG ============ #
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "geo_bus",
}
# ================================ #


def flatten_coords(geom):
    """
    Turn LINESTRING or MULTILINESTRING into one flat list of coords
    in the original order.
    """
    coords = []

    if isinstance(geom, LineString):
        coords = list(geom.coords)

    elif isinstance(geom, MultiLineString):
        for line in geom.geoms:
            coords.extend(list(line.coords))

    else:
        raise ValueError(f"Unsupported geometry type: {geom.geom_type}")

    return coords


def reverse_and_trim_last_if_first(wkt_text: str) -> str:
    """
    - Load WKT (LINESTRING or MULTILINESTRING)
    - Flatten to one coord list
    - Reverse the coord list
    - If last point == first point, drop the last
    - Return a LINESTRING WKT
    """
    geom = wkt.loads(wkt_text)
    coords = flatten_coords(geom)

    if len(coords) < 2:
        raise ValueError("Not enough points to build a line.")

    # reverse order
    coords = coords[::-1]

    # remove last if it equals first
    if coords[0] == coords[-1]:
        coords = coords[:-1]

    if len(coords) < 2:
        raise ValueError("Not enough points left after trimming.")

    reversed_line = LineString(coords)
    return reversed_line.wkt


def reverse_route(ma_tuyen: str):
    conn = mysql.connector.connect(**DB_CONFIG)
    cur = conn.cursor()

    # confirm DB
    cur.execute("SELECT DATABASE()")
    print("Connected to database:", cur.fetchone()[0])

    # read Path
    cur.execute(
        "SELECT AsText(Path), AsText(Path_Nguoc) "
        "FROM tuyen_bus WHERE MaTuyen = %s",
        (ma_tuyen,),
    )
    row = cur.fetchone()
    if not row:
        print(f"No row found with MaTuyen = {ma_tuyen}")
        cur.close()
        conn.close()
        return

    path_wkt, path_nguoc_wkt = row

    print("Before:")
    print("  Path       =", (path_wkt[:100] + "...") if path_wkt else None)
    print("  Path_Nguoc =", (path_nguoc_wkt[:100] + "...") if path_nguoc_wkt else None)

    if not path_wkt:
        print("Path is NULL, nothing to reverse.")
        cur.close()
        conn.close()
        return

    # build reversed & trimmed WKT
    try:
        cleaned_reversed_wkt = reverse_and_trim_last_if_first(path_wkt)
    except Exception as e:
        print("Error processing geometry:", e)
        cur.close()
        conn.close()
        return

    print("Reversed & trimmed LINESTRING (first 120 chars):")
    print(" ", cleaned_reversed_wkt[:120] + ("..." if len(cleaned_reversed_wkt) > 120 else ""))

    # update Path_Nguoc as a LINESTRING
    cur.execute(
        "UPDATE tuyen_bus "
        "SET Path_Nguoc = ST_GeomFromText(%s) "
        "WHERE MaTuyen = %s",
        (cleaned_reversed_wkt, ma_tuyen),
    )
    print("Rows affected by UPDATE:", cur.rowcount)
    conn.commit()

    # verify
    cur.execute(
        "SELECT AsText(Path_Nguoc) FROM tuyen_bus WHERE MaTuyen = %s",
        (ma_tuyen,),
    )
    row2 = cur.fetchone()
    print("After:")
    print("  Path_Nguoc =",
          (row2[0][:120] + "...") if row2 and row2[0] else None)

    cur.close()
    conn.close()


if __name__ == "__main__":
    ma = input("Enter MaTuyen (route code): ").strip()
    reverse_route(ma)
