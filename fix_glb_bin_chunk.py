import struct
import json

CURRENT = "public/models/main.glb"
BACKUP = "public/models/main_with_targets_backup.glb"


def read_glb_chunks(path):
    with open(path, "rb") as f:
        header = f.read(12)
        if header[:4] != b"glTF":
            raise ValueError("Not a GLB file")
        version = struct.unpack("<I", header[4:8])[0]
        length = struct.unpack("<I", header[8:12])[0]

        # Read first chunk (JSON)
        json_len = struct.unpack("<I", f.read(4))[0]
        json_type = f.read(4)
        if json_type != b"JSON":
            raise ValueError("First chunk is not JSON")
        json_bytes = f.read(json_len)

        # Read optional second chunk (BIN)
        bin_bytes = b""
        # If there's more data, read BIN
        rest = f.read()
        if rest:
            # rest begins with chunkLength + chunkType + data
            # It's possible there are multiple chunks; we only care first BIN
            offset = 0
            while offset + 8 <= len(rest):
                chunk_len = struct.unpack("<I", rest[offset : offset + 4])[0]
                chunk_type = rest[offset + 4 : offset + 8]
                data_start = offset + 8
                data_end = data_start + chunk_len
                data = rest[data_start:data_end]
                if chunk_type == b"BIN\x00":
                    bin_bytes = data
                    break
                offset = data_end
        return json_bytes, bin_bytes


def write_glb(path, json_bytes, bin_bytes):
    # 4-byte align JSON chunk
    while len(json_bytes) % 4 != 0:
        json_bytes += b" "
    chunks = []
    chunks.append(struct.pack("<I", len(json_bytes)) + b"JSON" + json_bytes)
    if bin_bytes:
        # 4-byte align BIN chunk (usually already aligned)
        while len(bin_bytes) % 4 != 0:
            bin_bytes += b"\x00"
        chunks.append(struct.pack("<I", len(bin_bytes)) + b"BIN\x00" + bin_bytes)
    total_len = 12 + sum(len(c) for c in chunks)
    with open(path, "wb") as f:
        f.write(b"glTF")
        f.write(struct.pack("<I", 2))
        f.write(struct.pack("<I", total_len))
        for c in chunks:
            f.write(c)


def main():
    # Read JSON from CURRENT (modified morph target names)
    cur_json, cur_bin = read_glb_chunks(CURRENT)
    # Read BIN from BACKUP (original binary data)
    bak_json, bak_bin = read_glb_chunks(BACKUP)
    if not bak_bin:
        raise RuntimeError("Backup file has no BIN chunk; aborting to avoid data loss")
    # Use current JSON + backup BIN
    write_glb(CURRENT, cur_json, bak_bin)
    print("✅ Rebuilt main.glb with modified JSON and original BIN chunk")


if __name__ == "__main__":
    main()
