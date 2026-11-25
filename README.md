# sing-box-sub-store-template

这是 [xream/scripts 中 sing-box 模板脚本](https://github.com/xream/scripts/blob/main/surge/modules/sub-store-scripts/sing-box/template.js) 的单文件 fork。只填订阅链接，就能把订阅中可转换的节点和端点加入模板里已有的每个 `selector` 和 `urltest` 策略组。组内已有成员保留在前，同名成员只列一次。

## 在 Sub-Store 中使用

1. 在「文件管理」中编辑文件，选用你的 sing-box JSON 模板。
2. 在「脚本操作」中填入下面的地址，把示例订阅换成自己的链接。

```text
https://raw.githubusercontent.com/inkzer0/sing-box-sub-store-template/main/template.js#url=https://sub.example.com/feed
```

使用可视化参数编辑器时，参数名填 `url`，值直接粘贴完整订阅链接。手动拼接脚本地址时，对订阅链接整体使用 `encodeURIComponent` 编码，避免其中的 `&` 或 `#` 被解析成脚本参数。例如，`https://sub.example.com/feed?token=demo&flag=1` 写成 `https%3A%2F%2Fsub.example.com%2Ffeed%3Ftoken%3Ddemo%26flag%3D1`。

生成文件后，模板中每个策略组都会列出全部订阅节点。如果组在处理后仍为空，沿用上游的直连回退。需要按地区分组时，仍可显式传入原版的 `outbound` 筛选规则。
