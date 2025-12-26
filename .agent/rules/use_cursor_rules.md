---
trigger: always_on
description: Use existing Cursor rules for this project
---

# Project Rules

このプロジェクトのルールは `.cursor/rules` 配下に定義されています。

## 必須アクション

タスクを開始する際は、**必ず最初に** 以下のファイルを読み込んでください：

- `.cursor/rules/general.mdc`


また、タスク開始時に、`.cursor/rules/github.mdc`内に記載されているPDCAフローを厳守してください


## ルールの適用

`general.mdc` を読み込んだ後、その指示に従って、タスクの内容に応じた追加のルールファイル（例：`implementation.mdc`, `requirements.mdc` など）を自律的に読み込んで適用してください。


