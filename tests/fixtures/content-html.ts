export const quill='<h1>ไทย</h1><h2>Heading</h2><h3>Heading</h3><h4>Heading</h4><h5>Legacy</h5><h6>Legacy</h6><p><br></p><p class="ql-align-center ql-indent-8 ql-direction-rtl"><strong>B</strong><em>I</em><u>U</u><s>S</s><sub>sub</sub><sup>sup</sup></p><ol><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>Bullet</li><li data-list="ordered">Ordered</li></ol><ul><li>Legacy bullet</li></ul><blockquote>Quote</blockquote><pre class="ql-syntax"><code>const x=1</code></pre>'+[16,18,20,24,28,32,48,64].map(n=>`<span style="font-size:${n}px;color:#aabbcc;background-color:rgb(12, 34, 56)">${n}</span>`).join('')+'<a href="https://example.test" target="_blank">web</a><a href="http://example.test">http</a><a href="mailto:a@example.test">email</a><a href="tel:+123">phone</a><img src="https://app.example.test/media/a.png" width="320" height="200" alt="Thai &amp; text"><img src="/media/b.png">'+['https://www.youtube.com/embed/abc_123?showinfo=0','https://www.youtube-nocookie.com/embed/abc-123','https://player.vimeo.com/video/123/'].map(src=>`<iframe class="ql-video" src="${src}" allowfullscreen="true" frameborder="0" width="640" height="360"></iframe>`).join('');
export const attacks=[
 '<script>alert(1)</script><style>p{background:url(x)}</style><object data=x>bad</object><embed src=x><form><input name=x></form><p>safe</p>',
 '<svg><foreignObject><img src=x onerror=alert(1)></foreignObject><a xlink:href="javascript:alert(1)">x</a></svg><math><mtext><img src=x onerror=x></mtext></math>',
 '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=alert(1)>">',
 '<svg></p><style><a id="</style><img src=x onerror=alert(1)>">',
 '<p id="attributes" name="__proto__" class="evil ql-align-center ql-indent-99" data-evil=x aria-label=x background=x onclick=x>safe<img srcset="https://evil/x 2x" src="https://evil/x"><picture><source srcset=x></picture></p>',
 '<p style="position:fixed;behavior:url(x);background:url(x);--x:url(x);font-size:999px;color:expression(alert(1));background-color:var(--x)">safe</p>',
 '<span style="font-size:24px;color:#fff;position:absolute;background-image:url(x)">safe</span><span style="color:r\\65 d;background-color:rgb(999,0,0);font-size:calc(16px)">safe</span>',
 '<iframe src="https://www.youtube.com/embed/abc" srcdoc="<script>x</script>" onload=x allow="camera"></iframe>',
 '<img src="/media/x" width="-1" height="Infinity" style="width:999999px"><img src="/media/x" width="999999" height="NaN">',
];

// Byte-exact Quill 2.0.3 html() interpolations of hostile embed values, no KaTeX dependency.
const formulaValue='"<img src=x onerror=alert(1)>';
const videoValue='https://example.test/"><img src=x onerror=alert(1)>';
export const quillExports=[`<span>${formulaValue}</span>`,`<a href="${videoValue}">${videoValue}</a>`];
