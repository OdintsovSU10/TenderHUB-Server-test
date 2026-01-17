@echo off
echo Enter your GitHub Personal Access Token:
set /p TOKEN=
git push https://OdintsovSU10:%TOKEN%@github.com/OdintsovSU10/TenderHUB-Server-test.git main
echo Done!