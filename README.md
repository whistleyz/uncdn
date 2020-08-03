# UNCDN

一个从 [unpkg](https://github.com/mjackson/unpkg) 项目中获取思路的项目，以 npm/cnpm 为源站的 cdn 分发服务

## TROUBLESHOOT

### 为什么基于 unpkg 重写

偶然间才了解到 unpkg 项目，基于 npm 作为源站的 cdn 分发服务思路很不错。以往基于文件路径或者文件hash的cdn服务，后期你可能都不知道哪些文件还有用，哪些文件已经废弃。而基于 npm 的版本发布的方式，一方面可以版本更新迭代可追述，而且发布尤为简单。

### 为什么要支持非 js 的静态文件

unpkg 不支持非 js 的静态文件的思路是对的，因为 npm 毕竟是 nodejs 的包管理工具。这里我认为 npm 的工作流更像是一个 cdn 源站的应有的，但是目前 cdn 源站要么自己手动上传文件，要么各有各的上传工具，很是让人头疼。

## TODO LIST：

- [ ] html, css, image 等静态文件支持
- [ ] cnpm 支持
- [ ] 文件浏览器

