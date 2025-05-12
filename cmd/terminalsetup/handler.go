/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package terminalsetup

import (
    "encoding/json"
    //"fmt"
    "net/http"
    //"strings"
    //"sync"
    //"context"
    //"io"
    //"os"


    sj "gopkg.in/igm/sockjs-go.v2/sockjs"
    "github.com/gin-gonic/gin"
    //corev1 "k8s.io/api/core/v1"
    //"k8s.io/client-go/tools/remotecommand"
    //scheme "k8s.io/client-go/kubernetes/scheme"
    //"github.com/google/uuid"

    "github.com/karmada-io/dashboard/pkg/client"
    "github.com/karmada-io/dashboard/cmd/api/app/router"
    "github.com/gin-contrib/cors"
    //metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    //"k8s.io/client-go/rest"
    //"k8s.io/apimachinery/pkg/apis/meta/v1"
    //"k8s.io/client-go/kubernetes/scheme"
    //"k8s.io/client-go/util/wait"
    //"k8s.io/client-go/util/retry"
    //"k8s.io/client-go/kubernetes"
    //"k8s.io/client-go/tools/clientcmd"
    
    
)

// jsonMustMarshal builds a TermMessage envelope and returns it as a string
/*func jsonMustMarshal(op, msg string) string {
    m := TermMessage{Op: op, Msg: msg}
    b, _ := json.Marshal(m)
    return string(b)
}
func CORSMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
        c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
        c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }

        c.Next()
    }
}*/

// CustomSession holds information about each terminal session
type CustomSession struct {
	Namespace string
	PodName   string
	Container string
}

// TerminalSession stores session info for terminal streaming
type TerminalSession struct {
	sess          sj.Session
	bound         chan struct{}
	sockJSSession sj.Session
}

var podInfoStore = make(map[string]CustomSession)
var terminalSessions = make(map[string]TerminalSession)

// SockJSSessionWriter wraps SockJS session and implements io.Writer
type SockJSSessionWriter struct {
	sess sj.Session
}

// Write implements io.Writer for SockJSSessionWriter
func (w *SockJSSessionWriter) Write(p []byte) (n int, err error) {
	// Send data through SockJS session
	if err := w.sess.Send(string(p)); err != nil {
		return 0, err
	}
	return len(p), nil
}

// openStream opens a stream to the pod for executing commands
/*func openStream(restCfg *rest.Config, clientset kubernetes.Interface, namespace, podName, containerName string) (remotecommand.StreamOptions, error) {
	req := clientset.CoreV1().
		RESTClient().
		Post().
		Resource("pods").
		Name(podName).
		Namespace(namespace).
		SubResource("exec").
		Param("stdin", "true").
		Param("stdout", "true").
		Param("stderr", "true").
		Param("tty", "true").
		Param("container", containerName)

	executor, err := remotecommand.NewSPDYExecutor(restCfg, "POST", req.URL())
	if err != nil {
		return remotecommand.StreamOptions{}, err
	}

	streamOptions := remotecommand.StreamOptions{
		Stdin:  os.Stdin,
		Stdout: os.Stdout,
		Stderr: os.Stderr,
	}

	return streamOptions, nil
}*/

// StartTerminalStream connects to the pod and streams data
/*func StartTerminalStream(meta CustomSession, sess sj.Session) {
	// Initialize the stream to the pod (exec to the pod)
	streamOptions, err := openStream(restCfg, k8sClient, meta.Namespace, meta.PodName, meta.Container)
	if err != nil {
		sess.Send("ERROR: failed to open exec stream")
		return
	}

	// Create a custom writer for SockJS session
	sockJSWriter := &SockJSSessionWriter{sess: sess}

	// Stream data from Pod to SockJS (stdout)
	go func() {
		io.Copy(sockJSWriter, streamOptions.Stdout) // Write to SockJS from Pod stdout
	}()

	// Stream data from SockJS to Pod (stdin)
	go func() {
		for {
			msg, err := sess.Recv() // Receive stdin from SockJS
			if err != nil {
				return
			}
			io.WriteString(streamOptions.Stdin, msg+"\n") // Write stdin data to Pod
		}
	}()
}*/

// sockHandler handles SockJS communication from frontend
func sockHandler(sess sj.Session) {
	raw, err := sess.Recv() // Receive bind message from frontend
	if err != nil {
		sess.Send("ERROR: failed to read initial message")
		return
	}

	var bind struct {
		Op        string `json:"op"`
		SessionID string `json:"sessionId"`
	}

	err = json.Unmarshal([]byte(raw), &bind) // Convert raw string to []byte before unmarshalling
	if err != nil {
		sess.Send("ERROR: failed to parse bind message")
		return
	}

	// Validate the bind message
	if bind.Op != "bind" {
		sess.Send("ERROR: first operation must be 'bind'")
		return
	}

	// Fetch Pod info using the sessionID
	/*meta, ok := podInfoStore[bind.SessionID]
	if !ok {
		sess.Send(fmt.Sprintf("ERROR: unknown session %s", bind.SessionID))
		return
	}*/

	// Bind the session and initialize terminal stream
	terminalSessions[bind.SessionID] = TerminalSession{
		sockJSSession: sess,
		bound:         make(chan struct{}),
	}

	close(terminalSessions[bind.SessionID].bound) // Signal that session is bound

	// Start terminal stream to the Pod
	//StartTerminalStream(meta, sess) // This connects the backend to the pod
}

// GetToken retrieves the authorization token for the terminal
func GetToken(c *gin.Context) {
	rawToken := client.GetBearerToken(c.Request)
	c.JSON(http.StatusOK, gin.H{"token": rawToken})
}

/*func Init(r *gin.RouterGroup) {
    r.Use(cors.Default())

    r.POST("/terminal", TriggerTerminal)
    r.GET("/auth/token", GetToken)

    ws := sj.NewHandler("/terminal/ws", sj.DefaultOptions, sockHandler)
    r.Any("/terminal/ws/*any", gin.WrapH(ws))
}*/



func Init() {
    r := router.V1()
    //r.Use(CORSMiddleware())
    r.Use(cors.Default())
    // trigger pod creation
    r.POST("/terminal", TriggerTerminal)

    // auth token (unchanged)
    r.GET("/auth/token", GetToken)


	ws := sj.NewHandler("/terminal/ws", sj.DefaultOptions, sockHandler)

	// ☑️  accept *every* method (GET, POST, OPTIONS) and every sub-path
	r.Any("/terminal/ws/*rest", gin.WrapH(ws))
	
}




