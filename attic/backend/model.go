package main

type Collection struct {
	Name string `json:"name"`
}

type Photo struct{}

type Participant struct {
	ExperimentId int64  `json:"experimentId"`
	Id           int64  `json:"id"`
	Name         string `json:"name"`
	Group        string `json:"group"`
	Sex          string `json:"sex"`
}
