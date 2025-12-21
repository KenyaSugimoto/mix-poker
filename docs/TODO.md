今の実装では、テーブル内にSeatPanelの情報が全て収まり切ってないという課題があります。

そのため、まずはできるだけTableView以外のコンポーネントの領域を小さくする工夫をしたいです。
まずそのためにできそうなことを下記にまとめます。

- 履歴, 設定ボタンをハンバーガーメニューにして畳む
- 1列目GameHeader, 2列目TableView, 3列目(ActionPanel or StartDealButton)で縦並びになっている部分を、1列目TableView, 2列目(GameHeaderに載せてた情報 + ActionPanel or StartDealButton)の2列にする
  - ActionPanel or StartDealButtonとGameHeaderはそれぞれ横1列分スペースを取る必要はないため

