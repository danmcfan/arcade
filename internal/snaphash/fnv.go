// Package snaphash holds the FNV-1a 32-bit hash used by the golden snapshots
// (hive `itemsHash`, wave `cellsHash`). The TS twin is fnv1a32 in
// src/engine/gomath.ts. Harness-only: nothing in the game reads it.
package snaphash

import (
	"encoding/binary"
	"hash/fnv"
)

// FNV1a32 hashes each value as 4 little-endian bytes, in order.
func FNV1a32(values []uint32) uint32 {
	h := fnv.New32a()
	var b [4]byte
	for _, v := range values {
		binary.LittleEndian.PutUint32(b[:], v)
		h.Write(b[:])
	}
	return h.Sum32()
}
