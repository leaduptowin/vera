# Security Policy

## Supported Versions

当前维护 `main` 分支的最新代码。

## Reporting a Vulnerability

请不要通过公开 Issue 披露安全问题。使用 GitHub 仓库的 **Security → Advisories → Report a vulnerability**（<https://github.com/leaduptowin/vera/security/advisories/new>）私下报告，并附上：

- 影响范围；
- 复现步骤；
- 浏览器与版本；
- 可能泄露的数据；
- 建议修复方式（如果有）。

## Security Model

MINUTE 是一个纯前端应用：

- 没有项目后端、数据库或账户系统；
- 会议数据存储在浏览器 `localStorage`；
- 默认 Mock SSE，不会向外部 LLM 发送内容；
- 真实 LLM 接入由使用者自行提供。

## API Keys

不要把真实 LLM API Key 写进源码、仓库、截图或 Issue。任何需要密钥的接入方案都应该使用：

1. 用户自行在本地填写并只保存在浏览器；或
2. 自己的服务端 / 边缘函数代理，服务端持有密钥。

## Web Speech API

语音识别由浏览器实现。Chrome / Edge 等浏览器可能将音频发送给厂商的语音服务处理。请勿将本项目描述为“语音全程离线”，除非你替换为真正的本地 ASR 实现。

## Reporting Data Handling Issues

如果发现持久化数据、导入/导出、剪贴板或音频处理可能导致的隐私问题，也请使用私下渠道报告。
