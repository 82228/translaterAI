package server

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
)

const (
	apiURL    = "https://api.deepseek.com/v1/chat/completions"
	apiKey    = "sk-0ddd27682e3042f682844fe763d587a8" // 替换为你的实际 API Key
	modelName = "deepseek-chat"                       // 或其他可用模型
)

// 请求结构体
type RequestBody struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// 响应结构体
type APIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

// 调用AI大模型并返回数据
func ResponseAi(content string) string {
	// 1. 构造请求数据
	requestBody := RequestBody{
		Model: modelName,
		Messages: []Message{
			{Role: "user", Content: content},
		},
	}

	jsonBody, _ := json.Marshal(requestBody)

	// 2. 创建 HTTP 请求
	req, _ := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonBody))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	// 3. 发送请求
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic("请求失败: " + err.Error())
	}
	defer resp.Body.Close()

	// 4. 读取响应
	body, _ := io.ReadAll(resp.Body)

	// 5. 解析响应
	var apiResp APIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		panic("解析响应失败: " + err.Error())
	}

	// 6. 输出结果
	if len(apiResp.Choices) > 0 {
		return apiResp.Choices[0].Message.Content
	} else {
		return "未收到有效回复"
	}
}
