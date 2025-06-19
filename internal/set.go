package internal

type Empty struct{}

type Set map[string]Empty

func (s Set) Add(key string) {
	s[key] = Empty{}
}

func (s Set) Delete(key string) {
	delete(s, key)
}

func (s Set) Contains(key string) bool {
	_, ok := s[key]
	return ok
}
