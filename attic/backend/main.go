package main

import (
	//	"encoding/json"

	"html/template"
	"io"
	"io/ioutil"
	"log"
	"mime"
	"mime/multipart"
	"net/http"
	"strings"

	"github.com/gorilla/rpc"
	json2 "github.com/gorilla/rpc/json"

	"appengine"
)

var uploadTemplate = template.Must(template.New("root").Parse(rootTemplateHTML))

const rootTemplateHTML = `
<html><body>
<form action="{{.}}" method="POST" enctype="multipart/form-data">
Upload File: <input type="file" name="file" multiple=""><br>
<input type="submit" name="submit" value="Submit">
</form></body></html>
`

func foo(w http.ResponseWriter, r *http.Request) {
	c := appengine.NewContext(r)

	mediaType, params, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil {
		log.Fatal(err)
	}
	if strings.HasPrefix(mediaType, "multipart/") {
		mr := multipart.NewReader(r.Body, params["boundary"])
		for {
			p, err := mr.NextPart()
			if err == io.EOF {
				return
			}
			if err != nil {
				log.Fatal(err)
			}
			slurp, err := ioutil.ReadAll(p)
			if err != nil {
				log.Fatal(err)
			}
			c.Errorf("Part %q: %q\n", p.Header.Get("Foo"), slurp)
		}
	}

	// var f []byte
	f, err := ioutil.ReadAll(r.Body)
	if err != nil {
		panic(err)
	}
	c.Errorf("BEGIN")
	c.Errorf("%v", string(f))
	c.Errorf("END")
}

func init() {
	s := rpc.NewServer()
	s.RegisterCodec(json2.NewCodec(), "application/json")
	RegisterServices(s)
	http.Handle("/rpc", s)
	http.HandleFunc("/x", foo)
}
