package snaphash

import "testing"

// Same vectors as src/engine/gomath.test.ts: the empty hash is the offset
// basis, and [0x6f6f66, 0x726162] as LE uint32s is the bytes "foo\0bar\0".
// Expected values cross-checked with fnv1a32 in src/engine/gomath.ts.
func TestFNV1a32OverLittleEndianUint32s(t *testing.T) {
	cases := []struct {
		in   []uint32
		want uint32
	}{
		{nil, 0x811c9dc5},
		{[]uint32{0x6f6f66, 0x726162}, 0x5ec567fe},
		{[]uint32{1, 2, 3}, 2034659765},
	}
	for _, c := range cases {
		if got := FNV1a32(c.in); got != c.want {
			t.Errorf("FNV1a32(%v) = %#x, want %#x", c.in, got, c.want)
		}
	}
}
