## 下载Kimi

![image-20260131112813982](https://oss.mytest.cc/2026/01/11ae9ae867e926b2bf49ca107fdcac22.png)

在我们的输入终端输入,即可下载使用

```shell
curl -L code.kimi.com/install.sh | bash
```

![image-20260131112942229](https://oss.mytest.cc/2026/01/a48dbabcf6b1d5c5fad461dc656ba2e6.png)

安装完成后如图所示
验证安装是否成功：

```shell
kimi --version
```

此时在终端输入·`kimi`即可打开使用，如果你开通他们家的套餐那你可以继续输入/login登录使用，而我要介绍的方式是免费使用

那就需要介绍到nvdia这个平台了，首先登录https://build.nvidia.com/explore/discover，接着点击Get API Key会提示你注册，接着根据提示输入邮箱注册即可，+86手机号也可以通过验证

![image-20260131113208461](https://oss.mytest.cc/2026/01/c6b6a0e364fe00652e61bd288878e83b.png)

在这个页面可以生成/管理自己的API Key
![image-20260131113408941](https://oss.mytest.cc/2026/01/f01a0a25ce4f1f8ff9727e2e19ba330d.png)
拿到API Key后我们在终端编辑
```shell
vim ~/.kimi/config.toml
```

