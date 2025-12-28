---
trigger: always_on
description: Use existing rules for this project
---

# Project Rules

このプロジェクトのルールは `.agent/rules` 配下に定義されています。

## 必須アクション

タスクを開始する際は、**必ず最初に** 以下のファイルを読み込んでください：

- `.agent/rules/general.md`


また、タスク開始時に、`.agent/rules/github.md`内に記載されているPDCAフローを厳守してください


## ルールの適用

`general.md` を読み込んだ後、その指示に従って、タスクの内容に応じた追加のルールファイル（例：`implementation.md`, `requirements.md` など）を自律的に読み込んで適用してください。
