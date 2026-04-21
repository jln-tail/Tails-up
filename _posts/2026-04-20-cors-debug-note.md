---
title: "踩坑：前端本地访问生产 API，CORS preflight 一直 403"
date: 2026-04-20
tags: [bug, cors, frontend, debugging]
description: "本地 dev server 调生产接口，OPTIONS preflight 返回 403，排查过程与结论。"
---

## 现象

本地 `http://localhost:5173` 调用生产 `https://api.example.com/v1/users`，浏览器报：

```text
Access to fetch at 'https://api.example.com/v1/users' from origin
'http://localhost:5173' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

Network 面板里 `OPTIONS /v1/users` 状态码 **403**，请求体为空。

![DevTools Network 面板中 OPTIONS 返回 403 的截图](/assets/images/2026-04-20-cors/preflight-403.png)

## 排查过程

### 1. 怀疑后端没配 CORS

先直接用 curl 手动发一个 preflight，看响应头：

```bash
curl -i -X OPTIONS https://api.example.com/v1/users \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization,content-type"
```

返回：

```text
HTTP/1.1 403 Forbidden
Server: cloudfront
X-Cache: Error from cloudfront
```

注意到 `Server: cloudfront`——请求根本没到后端，**被 CDN 拦了**。

### 2. 检查 CloudFront 行为

登 AWS 控制台看 CloudFront 这个 distribution 的 Behaviors：

- `Allowed HTTP Methods` 只勾了 `GET, HEAD`。
- **OPTIONS 没被允许**，于是 CloudFront 直接返回 403，根本不 forward 到 origin。

这就是典型的"后端 CORS 配得对，但流量被前面一层挡了"——排查时容易忽略。

### 3. 修复

把 Allowed HTTP Methods 改成 `GET, HEAD, OPTIONS`（或者 `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE` 如果是完整 API）。

等 CloudFront invalidation 跑完（约 3-5 分钟），再发一次 preflight：

```text
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: authorization, content-type
Access-Control-Max-Age: 600
```

浏览器端 CORS 报错消失，实际请求正常返回。

## 结论与 checklist

下次遇到类似 CORS 异常，按这个顺序查：

1. **用 curl 发 preflight**，别光看浏览器。浏览器的错误信息会把"被 CDN 拦"和"后端没配 CORS"混为一谈。
2. 看响应头的 `Server` / `Via` / `X-Cache`，判断请求到没到后端。
3. 如果中间有 CloudFront / Cloudflare / Nginx / API Gateway，逐层检查是否允许 OPTIONS 方法 **以及是否转发相关请求头**（尤其是 `Origin`、`Access-Control-Request-*`）。
4. 后端 CORS middleware 最后再查。

一句话：**CORS 不一定是后端的锅，经常是中间代理。**
