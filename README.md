# Spanish Claw Web MVP

Spanish Claw 是一个面向西班牙语学习者的 Flask Web MVP。首版验证“边听边点边查边收藏”的核心学习闭环。

## 功能

- 首页产品介绍
- Lesson 页面展示西语听力材料
- 点击单词显示词条解释
- 点击句子显示句子层解释
- 使用 localStorage 收藏词句
- 我的收藏页查看、筛选和删除收藏

## 运行

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m app.app
```

然后打开：

```text
http://127.0.0.1:5000
```

## 目录

```text
app/
  app.py
  routes.py
  data_loader.py
data/
  lessons.json
  vocab.json
templates/
  index.html
  lesson.html
  saved.html
static/
  style.css
  app.js
  audio.js
```
