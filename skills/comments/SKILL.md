---
name: comments
version: "1.0.0"
description: Apply when writing or reviewing a code comment in any language (inline notes, implementation comments), documentation blocks aside
license: Unlicense
metadata:
  author: ssoft
  tier: narrow
  bound-to:
    - universal
  rubric: applied
  paths:
    - "**/*.{c,cc,cpp,cxx,h,hh,hpp,hxx,inl,ipp,m,mm,java,cs,go,rs,swift,kt,kts,scala,php,qml,dart,groovy,gradle,glsl,vert,frag,proto}"
    - "**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx,css,scss,less}"
    - "**/*.{py,pyi,rb,pl,pm,sh,bash,zsh,fish,ps1,psm1,r,jl,ex,exs,nim,yml,yaml,toml,cfg,conf,tf,tfvars,cmake,mk}"
    - "**/*.{sql,lua,hs,elm,ada,adb,ads,vhd,vhdl}"
    - "**/*.{ini,lisp,cl,el,clj,cljs,cljc,scm,rkt,asm,s}"
    - "**/*.{tex,sty,cls,erl,hrl}"
    - "**/*.{html,htm,xhtml,xml,xsl,xslt,svg}"
    - "**/{CMakeLists.txt,Makefile,Dockerfile,Gemfile,Rakefile}"
    - "**/{.env,.gitignore,.gitattributes,.dockerignore,.editorconfig}"
  tags:
    - comments
    - style
---

# Skill: Code Comments

Apply when writing or reviewing a code comment in any language (inline notes, implementation comments), whatever marker opens it — `//`, `/* */`, `#`, `--`, `;`, `%`, `<!-- -->`.

Documentation blocks on a public header → the API-documentation skill of the language being written. This skill covers every other comment, in every language: inside function bodies, in implementation files, in a hook script, a build file or a configuration file. Implementation conventions (types, resource handling, naming) → the coding-conventions skill of the language being written.

---

## Philosophy

**Should**

Code documents itself, so a comment should not exist unless it earns its place: it should be there only where, without it, a reader would get a critical, non-obvious fact wrong, and it should never restate what the code already shows.

- **Default to none** — the code should be made self-explanatory first (better names, extracted function, clearer types). "Might help the reader" is not enough; the bar is that they get it *wrong* without the line.
- **Keep it short** — a comment should be one line, with no multi-line prose block outside a documentation block.
- **General character, not case history** — a comment should state a timeless fact about the code (an invariant, a constraint, a non-obvious reason), not the story of how it got that way.

## When a Comment Is Justified

**May**

A comment may say what the code cannot:
- It may name a hidden constraint or external requirement (a protocol quirk, a platform limitation)
- It may name a subtle invariant a reader could otherwise break by "simplifying"
- It may state a workaround in general terms (what breaks and why), not as a changelog entry
- It may flag behaviour that would genuinely surprise a careful reader

## What Never Belongs in a Comment

**Should**

- **References to the current task, ticket, bug ID, or "just fixed"** — a comment should not carry them; they belong in the commit message. A comment describing the fix for an error introduced moments ago is a diary entry, not documentation, and it rots the moment the surrounding code changes again.
- **What the code already says** — a comment that loses no information when it is removed should be deleted.
- **Narration of a specific decision's private context** ("we chose X because the other team asked", "temporary until Y ships") — a comment should state the general constraint instead, leaving case-specific context to the commit message or PR description.
- **Multi-paragraph explanations** — a comment should not run to paragraphs; the invariant should be extracted into a named function or type instead.

```cpp
// Wrong — narrates a private fix history, will rot, belongs in commit message
// Fixed crash reported in issue #482: connection was null after close.
if (connection == nullptr) return;

// Correct — general, timeless fact about the code
// Upstream API returns null once the connection is closed.
if (connection == nullptr) return;
```

## Warning Signs — delete the comment

**Should**

A comment should be deleted wherever the reason for keeping it is one of these:
- "This might help the next reader" — not enough; the bar is they get it *wrong* without it.
- "This expression is non-obvious, I'll explain it" — it should be named instead (extract a constant or function), not explained in prose.
- "I'll note why I chose this approach" — that is commit-message material, not a code comment.

## Cross-References

**Recommended**

- `commit-rules` — where task/fix/ticket context actually belongs
