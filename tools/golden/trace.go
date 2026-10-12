package main

import (
	"bytes"
	"compress/gzip"
	"os"
	"path/filepath"
)

// traceScript replays a script and returns the uncompressed JSONL: line k
// (0-based) is the snapshot after tick k+1. Wave's last line is full.
func traceScript(s *Script) []byte {
	r := newRunner(s)
	var out bytes.Buffer
	for !r.done() {
		r.step()
		full := s.Scene == "wave" && r.done()
		out.Write(marshalLine(r.line(full)))
	}
	return out.Bytes()
}

func writeTrace(fixtures string, s *Script) (int, error) {
	jsonl := traceScript(s)
	var gz bytes.Buffer
	w, err := gzip.NewWriterLevel(&gz, gzip.BestCompression)
	if err != nil {
		return 0, err
	}
	// Zero header (no name, no mtime) so regeneration is byte-identical.
	if _, err := w.Write(jsonl); err != nil {
		return 0, err
	}
	if err := w.Close(); err != nil {
		return 0, err
	}
	dir := filepath.Join(fixtures, "traces")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return 0, err
	}
	return gz.Len(), os.WriteFile(filepath.Join(dir, s.Name+".jsonl.gz"), gz.Bytes(), 0o644)
}
