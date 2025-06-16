package controller

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"mvc/pkg/param"
	"mvc/server"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

var Content string

type DataUrlRequest struct {
	DataUrl string `json:"dataUrl"`
}

func File(w http.ResponseWriter, r *http.Request) {
	fmt.Println("121212121212")
	// 设置CORS头（根据需求调整）
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// 处理预检请求
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// 确保是POST请求
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 读取请求体
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// 获取dataURL
	dataURL := string(body)
	fmt.Printf("Received dataURL (length: %d bytes)\n", len(dataURL))

	// 解析dataURL格式（示例：data:image/png;base64,iVBORw0KGgo...）
	parts := strings.SplitN(dataURL, ",", 2)
	if len(parts) != 2 {
		http.Error(w, "Invalid dataURL format", http.StatusBadRequest)
		return
	}

	// 解析MIME类型
	headerPart := parts[0]
	dataPart := parts[1]

	mimeParts := strings.Split(headerPart, ";")
	if len(mimeParts) < 1 {
		http.Error(w, "Invalid MIME type", http.StatusBadRequest)
		return
	}

	// 获取文件扩展名
	mimeType := strings.TrimPrefix(mimeParts[0], "data:")
	var extension string
	switch mimeType {
	case "image/png":
		extension = "png"
	case "image/jpeg":
		extension = "jpg"
	case "image/gif":
		extension = "gif"
	default:
		http.Error(w, "Unsupported file type", http.StatusBadRequest)
		return
	}

	// 解码Base64数据
	decoded, err := base64.StdEncoding.DecodeString(dataPart)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println("解码之后的", decoded)

	// 创建存储目录
	uploadDir := "./uploads"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		http.Error(w, "Failed to create upload directory", http.StatusInternalServerError)
		return
	}

	// 生成唯一文件名
	fileName := fmt.Sprintf("%d.%s", time.Now().UnixNano(), extension)
	filePath := filepath.Join(uploadDir, fileName)
	fmt.Println("保存后的路径", filePath)
	// 保存文件
	if err := ioutil.WriteFile(filePath, decoded, 0644); err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}

	// 运行 Tesseract OCR 命令
	outputFileBase := filepath.Join("uploads", "output")
	cmd := exec.Command("tesseract", filePath, outputFileBase, "-l", "chi_sim")
	err = cmd.Run()
	if err != nil {
		fmt.Println("运行错误", err)
		http.Error(w, "Failed to run Tesseract OCR", http.StatusInternalServerError)
		return
	}

	// 构建完整的输出文件路径，包括 .txt 扩展名
	outputFilePath := outputFileBase + ".txt"

	// 读取 OCR 结果
	ocrResult, err := os.ReadFile(outputFilePath)
	if err != nil {
		fmt.Println("读取错误", err)
		http.Error(w, "Failed to read OCR result", http.StatusInternalServerError)
		return
	}

	fmt.Println("读取的结果是", string(ocrResult))
	Content = fmt.Sprintf("翻译 %s 这个内容,只需给我翻译结果,别的不需要输出", string(ocrResult))
	result := server.ResponseAi(Content)
	fmt.Println(result)
	// 构造响应结构体
	response := param.Response{
		Success: true,
		Result:  result,
		Code:    http.StatusOK,
	}

	// 设置响应头
	w.Header().Set("Content-Type", "application/json")

	// 将响应结构体编码为 JSON 并发送给前端
	json.NewEncoder(w).Encode(response)

}
