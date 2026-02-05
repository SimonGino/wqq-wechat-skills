随着Anthropic宣布阻止第三方使用Claude Code订阅，许多第三方应用程序像OpenCode使用过程中都出现了错误。

![Image](https://private-user-images.githubusercontent.com/48773775/533688146-ecc0f211-a883-4a6a-b1c8-816d7ea449a2.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjgwMjg0MTMsIm5iZiI6MTc2ODAyODExMywicGF0aCI6Ii80ODc3Mzc3NS81MzM2ODgxNDYtZWNjMGYyMTEtYTg4My00YTZhLWIxYzgtODE2ZDdlYTQ0OWEyLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNjAxMTAlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjYwMTEwVDA2NTUxM1omWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPWRiMGI0YjY1YzQ1YzIyZjQxODNiNzdiYWU5MmQ3NDI4MjVmNDFhNWMwNzMyY2UyOTQzZjY0NmNjZjM2OWUxMDkmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.hAOR2w8h1oEKuELizsADZKJPARc5NvzQurEsHdaAjvM)

不过有趣的是Codex 宣布正与 OpenCode 合作，一个OpenCode,另一个叫做OpeanAI，真是很有意思呢。

![image-20260110145822766](/Users/wqq/Library/Application Support/typora-user-images/image-20260110145822766.png)

下面我手把手带大家操作在OpenCode使用OpenAI的模型吧



我们可以舍弃掉之前的插件  了，直接在终端里面opencode auth login启动OAuth授权，前提OpenCode版本大于1.1.1

```shell
opencode auth login
```

![image-20260110150139887](/Users/wqq/Library/Application Support/typora-user-images/image-20260110150139887.png)

![image-20260110150151843](/Users/wqq/Library/Application Support/typora-user-images/image-20260110150151843.png)



![image-20260110150311899](/Users/wqq/Library/Application Support/typora-user-images/image-20260110150311899.png)

![image-20260110150241623](/Users/wqq/Library/Application Support/typora-user-images/image-20260110150241623.png)

![image-20260110150331623](/Users/wqq/Library/Application Support/typora-user-images/image-20260110150331623.png)

看到这个图就说明成功啦



接着我们去验证下

![image-20260110150507672](/Users/wqq/Library/Application Support/typora-user-images/image-20260110150507672.png)

大功告成。