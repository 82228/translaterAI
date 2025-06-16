package dao

import (
	"log"
	"mvc/model"
)

// 数据库交互
// 通过账号获取信息
func MessSelect() (u model.User) {
	sqlStr := "select * from users"
	err := db.QueryRow(sqlStr).Scan(&u.Id, &u.UserName, &u.Password)
	if err != nil {
		log.Fatal("查询错误")
		return
	}
	return u
}
