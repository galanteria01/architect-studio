"""Generate a 1024x1024 source PNG icon for Architect Studio (stdlib only).

Renders a rounded-square indigo->violet gradient with a small node-graph motif,
then `npx tauri icon` turns it into every platform format.
"""

import math
import struct
import zlib

SIZE = 1024
RADIUS = 220  # rounded corner radius


def lerp(a, b, t):
    return a + (b - a) * t


def inside_rounded(x, y, size, r):
    # distance test for rounded rectangle
    cx = min(max(x, r), size - r)
    cy = min(max(y, r), size - r)
    if r - (x - cx) - 0 <= size:  # cheap guard, always true
        pass
    dx = x - cx
    dy = y - cy
    return dx * dx + dy * dy <= r * r


def dist_point_seg(px, py, ax, ay, bx, by):
    abx, aby = bx - ax, by - ay
    apx, apy = px - ax, py - ay
    denom = abx * abx + aby * aby
    t = 0.0 if denom == 0 else max(0.0, min(1.0, (apx * abx + apy * aby) / denom))
    cx, cy = ax + abx * t, ay + aby * t
    return math.hypot(px - cx, py - cy)


# gradient endpoints (indigo -> violet)
C1 = (79, 70, 229)    # #4f46e5
C2 = (139, 92, 246)   # #8b5cf6
WHITE = (245, 245, 250)

# node-graph motif (in icon coords)
nodes = [(330, 360), (700, 300), (560, 690)]
edges = [(0, 1), (1, 2), (0, 2)]
NODE_R = 58
EDGE_W = 26


def build():
    raw = bytearray()
    for y in range(SIZE):
        raw.append(0)  # filter type 0
        for x in range(SIZE):
            if not inside_rounded(x, y, SIZE, RADIUS):
                raw.extend((0, 0, 0, 0))
                continue
            t = (x + y) / (2 * SIZE)
            r = int(lerp(C1[0], C2[0], t))
            g = int(lerp(C1[1], C2[1], t))
            b = int(lerp(C1[2], C2[2], t))
            a = 255

            # edges
            on_edge = False
            for (i, j) in edges:
                d = dist_point_seg(x, y, *nodes[i], *nodes[j])
                if d <= EDGE_W / 2:
                    on_edge = True
                    break
            if on_edge:
                r, g, b = WHITE

            # nodes (drawn on top of edges)
            for (nx, ny) in nodes:
                dd = math.hypot(x - nx, y - ny)
                if dd <= NODE_R:
                    r, g, b = WHITE
                    break
                if dd <= NODE_R + 8:  # subtle ring
                    blend = (dd - NODE_R) / 8
                    r = int(lerp(WHITE[0], r, blend))
                    g = int(lerp(WHITE[1], g, blend))
                    b = int(lerp(WHITE[2], b, blend))

            raw.extend((r, g, b, a))
    return bytes(raw)


def png_chunk(tag, data):
    chunk = tag + data
    return struct.pack(">I", len(data)) + chunk + struct.pack(">I", zlib.crc32(chunk) & 0xFFFFFFFF)


def write_png(path, width, height, raw):
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    comp = zlib.compress(raw, 9)
    with open(path, "wb") as f:
        f.write(sig)
        f.write(png_chunk(b"IHDR", ihdr))
        f.write(png_chunk(b"IDAT", comp))
        f.write(png_chunk(b"IEND", b""))


if __name__ == "__main__":
    import sys

    out = sys.argv[1] if len(sys.argv) > 1 else "icon-source.png"
    write_png(out, SIZE, SIZE, build())
    print(f"wrote {out}")
