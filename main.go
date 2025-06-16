package main

import (
	"fmt"
	"mvc/controller"
	"net/http"
)

func main() {
	server := http.Server{Addr: ":8081"}
	http.HandleFunc("/file", controller.File)
	http.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))
	err := server.ListenAndServe()
	if err != nil {
		fmt.Println(err)
		return
	}
}
