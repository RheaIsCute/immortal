# immortal

Static report viewer for **VGK fixer** (Immortal), hosted on GitHub Pages at https://rheaiscute.github.io/immortal/.

VGK fixer's **Copy Link** button copies a `[Results](https://rheaiscute.github.io/immortal/r/#1z.<data>)` link. The report is JSON, deflate-compressed and base64url-encoded, and it sits in the URL fragment. Browsers never send the fragment to the server, so GitHub never receives or stores any report. `r/app.js` decodes the report in the reader's browser.

The viewer treats link data as untrusted. It caps the decompressed size at 64 KB, validates every field, renders only with `textContent`, and runs under a strict Content-Security-Policy with no inline or third-party scripts. `r/fx.js` only adds the decorative embers.

## Payload (v1)

Same format as the SYSINFO viewer (`RheaIsCute/vgkfixer`):

```json
{"v":1,"demo":false,"o":"complete|attention|failed","at":"<ISO time>","rt":"8.8s",
 "n":{"k":"Ethernet","s":"1 Gbps","a":"<adapter model>"},
 "st":[["<step title>","success|warning|error|running|pending","<detail>"]],
 "is":[["err|warn","<logged issue>"]]}
```

Prefix `#1z.` means deflate-raw compression; `#1u.` means uncompressed.
