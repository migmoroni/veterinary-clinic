# Monorepo Licensing Structure

This repository utilizes a granular, directory-based licensing model:

* **Default / Root License:** Unless a specific subdirectory contains its own `LICENSE` file (or specifies a different license in its local manifest), all root-level files, configurations, scripts, and general source code in this repository are licensed under the **MIT License** provided in full below.
* **Submodules & Packages:** Individual applications, services, or packages within this repository may be distributed under different license terms (e.g., AGPL-3.0-or-later, GPL-3.0-or-later, or LGPL-3.0-or-later). **Always check the `LICENSE` file or `package.json` manifest located within each respective module directory to determine its applicable terms.**

---

## Root License: MIT License

Copyright (c) 2026 Miguel Eduardo Senna Moroni

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.