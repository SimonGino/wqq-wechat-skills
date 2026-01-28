---
source: x 
url: https://x.com/LufzzLiz/status/2015380566703779890
title: "手把手教你使用remotion生成视频"
author: "@LufzzLiz"
captured_at: "2026-01-27"
---

原文摘录（复制）

手把手教你使用remotion生成视频
昨天发布了一个使用remotion生成视频的推文，小火了一下，有不少推友求教程，今天简单写一个分享给大家
remotion生成原理很简单，就是“用 React （一个前端框架）写动画”，所有动画都来自当前帧数，从而实现逐帧处理的逻辑
一、remotion相关背景：
当然为了写这篇文章，特意了解了下remotion的背景，惊讶发现这个项目实际起源于2021年，比ChatGPT还早，详见这个视频，是他们创始人再YouTube上分享使用 remotion 实现Spotify Wrapped 2020 
https://www.youtube.com/watch?v=I-y_5H9-3gk&t=86s
为什么现在火气来了呢？也很容易理解，看作者2021年的实现视频是2小时+，但是有了cladue code加持，可以看到他的Spotify Wrapped 2025  变成了4分39秒😂
所以一个高门槛的项目有了ai加持，变得全民普及了
二、实践教程
今天又实现了一个类似的视频，我们就以此为例
2.1 安装
选择一个目录安装该项目库：
npx create-video@latest
会让你选一个模版，这个随意就好
安装配套的remotion-dev/skills：
npx skills add https://github.com/remotion-dev/skills --skill remotion-best-practices
当然也可以直接安装skill然后让ai帮你安装项目库


2.2 视频制作
1.使用claude code 或者codex 等任意agent（后面统称code agent），输入如下提示词：
```
使用 remotion-best-practices skill 创建一个终端安装 npx skills add
https://github.com/cclank/news-aggregator-skill
--skill news-aggregator-skill 的演示动画视频，孟菲斯配色风格，打字机效果
```
然后你就可以先让code agent帮你启动这个这个项目，就可以看到如下界面，可以看到一个简单的视频就实现了，你可以根据自己的喜好告诉code agent进行微调，比如配色，播放速率、画面运转等等
2. 实现我们第二个场景：执行过程展示
article里看起来不太友好，大概意思就是告诉code agent 接下来的视频是将这个过程数据展示出来，过程数据需要自己真实安装执行获取
```
第二个提示词如下：
```
我希望续写这个视频。接下来是终端以一种动态翻书扩散到整个视频页面，然后进行展示命令执行过程。过程数据如下,注意要逐步显示，有一种真实安装的感觉，执行过程数据如下：
 Selected 1 skill: news-aggregator-skill
...后面省略（真实情况需全部粘贴给code agent）
```
3. 将跳舞视频嵌入到我们的视频里，提示词如下：
```
将这个视频完美嵌入到视频右侧 '~/Downloads/跳舞小视频.mp4'
```
PS：这个跳舞小视频需要自己找资源下载，我是通过抖音里找了一段，下载到本地，将路径告诉code agent即可
4. 微调嵌入视频，后面就是个人喜好的微调了，比如我想code agent帮我实现一个裸眼3d的效果，提示词如下：
```
大概在270帧的时候，我希望将嵌入的视频向左copy两次（带有动画特效），大概撑满屏幕实现裸眼3d的效果画面
```
2.3 视频导出
方式一：直接告诉code agent：将目前的视频丝滑的渲染出来。视频保留到当前目录
方式二：在浏览器页面，找到Render按钮，渲染导出即可
完事～
实现逻辑一张图表示：

当然，里面有不少需要微调的地方，需要自己根据视频效果区调整，尤其是做一个好的视频，还是需要对话多轮的。但基本上通过自然语言就可以实现逐帧编辑的效果，这个很赞。
三、资源推荐
remotion官方还有很多新的玩法和教程，详见这个链接，前期可以根据喜好来模仿学习：
https://www.remotion.dev/docs/resources
附项目开源地址：
skill： https://github.com/remotion-dev/skills
https://github.com/remotion-dev/remotion
