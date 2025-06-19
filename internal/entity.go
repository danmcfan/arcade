package internal

type Entity int

type EntityManager struct {
	current Entity
}

func NewEntityManager() *EntityManager {
	return &EntityManager{
		current: Entity(0),
	}
}

func (em *EntityManager) Next() Entity {
	em.current++
	return em.current
}
