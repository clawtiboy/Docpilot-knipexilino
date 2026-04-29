# Direkt nach GitHub pushen

```bash
cd docpilot-knipexilino-github
git init
git add .
git commit -m "Initial DocPilot Knipexilino MVP"
git branch -M main
git remote add origin https://github.com/DEIN-NAME/docpilot-knipexilino.git
git push -u origin main
```

Danach in GitHub unter **Actions** den Workflow **Build Android Debug APK** starten oder einfach erneut auf `main` pushen.

Die APK erscheint als Artifact im Workflow-Lauf.
