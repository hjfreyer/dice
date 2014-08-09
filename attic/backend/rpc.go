package main

import (
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/gorilla/rpc"

	"appengine"
	"appengine/datastore"
)

func RegisterServices(server *rpc.Server) {
	server.RegisterService(new(Experiments), "")
	server.RegisterService(new(Participants), "")
	server.RegisterService(new(Photos), "")
}

type Empty struct{}

type IntId struct {
	Id int64 `json:"id"`
}

type Experiments struct{}

type ExperimentWithId struct {
	Id         int64      `json:"id"`
	Experiment Experiment `json:"experiment"`
}

type ExperimentList struct {
	Experiments []ExperimentWithId `json:"experiments"`
}

func (h *Experiments) List(r *http.Request, request *Empty, response *ExperimentList) error {
	c := appengine.NewContext(r)

	var exps []Experiment
	keys, err := datastore.NewQuery("Experiment").GetAll(c, &exps)
	if err != nil {
		return err
	}

	response.Experiments = make([]ExperimentWithId, len(keys))
	for i, key := range keys {
		response.Experiments[i].Id = key.IntID()
		response.Experiments[i].Experiment = exps[i]
	}

	return nil
}

func (h *Experiments) Get(r *http.Request, request *IntId, response *Experiment) error {
	c := appengine.NewContext(r)

	key := datastore.NewKey(c, "Experiment", "", request.Id, nil)

	if err := datastore.Get(c, key, response); err != nil {
		return err
	}

	return nil
}

func (h *Experiments) Post(r *http.Request, request *Experiment, response *IntId) error {
	c := appengine.NewContext(r)

	if len(request.Name) == 0 {
		return errors.New("Must specify a name")
	}

	key := datastore.NewIncompleteKey(c, "Experiment", nil)
	key, err := datastore.Put(c, key, request)
	if err != nil {
		return err
	}

	response.Id = key.IntID()
	return nil
}

type Participants struct{}

type ParticipantList struct {
	Participants []Participant `json:"participants"`
}

func (h *Participants) List(r *http.Request, request *IntId, response *ParticipantList) error {
	c := appengine.NewContext(r)

	expKey := datastore.NewKey(c, "Experiment", "", request.Id, nil)
	_, err := datastore.NewQuery("Participant").Ancestor(expKey).GetAll(c, &response.Participants)
	return err
}

type ExperimentIdMixin struct {
	ExperimentId int64 `json:"experimentId"`
}

type ParticipantId struct {
	ExperimentId int64 `json:"experimentId"`
	Id           int64 `json:"id"`
}

func (h *Participants) Get(r *http.Request, request *ParticipantId, response *Participant) error {
	c := appengine.NewContext(r)

	expKey := datastore.NewKey(c, "Experiment", "", request.ExperimentId, nil)
	key := datastore.NewKey(c, "Participant", "", request.Id, expKey)
	if err := datastore.Get(c, key, response); err != nil {
		return err
	}

	return nil
}

func PutParticipant(c appengine.Context, p *Participant) error {
	if p.ExperimentId == 0 {
		return fmt.Errorf("Invalid experiment ID: %d", p.ExperimentId)
	}
	if p.Id == 0 {
		return fmt.Errorf("Invalid id: %d", p.Id)
	}

	key := datastore.NewKey(c, "Participant", fmt.Sprintf("%d,%d", p.ExperimentId, p.Id), 0, nil)
	_, err := datastore.Put(c, key, p)
	return err
}

type Participants_PutCsv_Request struct {
	ExperimentId int64  `json:"experimentId"`
	Csv          string `json:"csv"`
}

func (h *Participants) PutCsv(r *http.Request, request *Participants_PutCsv_Request, response *Empty) error {
	c := appengine.NewContext(r)

	reader := csv.NewReader(bytes.NewBufferString(request.Csv))
	headerRow, err := reader.Read()
	if err != nil {
		return err
	}

	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		if len(row) != len(headerRow) {
			return fmt.Errorf("Invalid row size: %v", row)
		}

		rowMap := make(map[string]string)
		for i, r := range row {
			rowMap[headerRow[i]] = r
		}

		id, err := strconv.Atoi(rowMap["id"])
		if err != nil {
			return err
		}

		err = PutParticipant(c, &Participant{
			ExperimentId: request.ExperimentId,
			Id:           int64(id),
			Name:         rowMap["name"],
			Group:        rowMap["group"],
			Sex:          rowMap["sex"],
		})

		if err != nil {
			return err
		}
	}

	return nil
}

type Photos struct{}

type Photos_GetUploadUrl_Request struct {
	ExperimentIdMixin
}

// func (*Photos) GetUploadUrl(r *http.Request, request *Photos_GetUploadUrl_Request, response *Photos_GetUploadUrl_Request) error {
// 	c := appengine.NewContext(r)
// 	uploadUrl, err := blobstore.UploadURL(c, "/rpc/blobstore-callback?experiment_id=3", nil)
// 	if err != nil {
// 		return err
// 	}

// 	response.ExperimentId = request.ExperimentId
// 	return nil
// }
