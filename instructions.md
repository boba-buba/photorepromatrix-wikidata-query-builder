# The question:
You are wikidata, wikibase and wikimedia developer expert. There is a project called wikidata-query-builder (https://gitlab.wikimedia.org/repos/wmde/wikidata-query-builder) that was created to allow people without knowing sparql query data from wikibase instances. I have my own wikibase instance and I created container from this code and started it. It runs ok, but during testing I found out that it is in the beginning of the development and does not support a lot useful query opportunities. Therefore I decided that I would implement them for my wikibase instance. The problem is that this project (wikidara-query-builder) is in official gitlab of mediawiki and they do not allow me to create the developer account to have my own branch and develop my features there. The only option I have is to clone the project to my pc and then create github repo where my version of this wikidata-query-builder would be. But I still want to get the updates from the gitlab official repo. What I am asking is there a possibility to create fork on github from a project in gitlab? Or something like that that would support getting updates from official repo and option to write my own code?

# Answer:
Absolutely! You **can** work with a GitLab project in your own GitHub repository while still keeping track of updates from the original GitLab repo. It’s a bit of a “manual fork” workflow, but it’s very doable. Let me break it down step by step, including how to keep updates in sync.

---

### **1. Clone the GitLab project locally**

```bash
git clone https://gitlab.wikimedia.org/repos/wmde/wikidata-query-builder.git
cd wikidata-query-builder
```

At this point, your local repo is linked to the GitLab repo as the `origin`.

---

### **2. Create a new repository on GitHub**

* Go to GitHub and create a **new repository** (e.g., `my-wikidata-query-builder`).
* Do **not** initialize it with README/other files—empty is fine.

---

### **3. Add your GitHub repo as a new remote**

```bash
git remote add github https://github.com/<your-username>/my-wikidata-query-builder.git
```

* Here, `github` is just a name for the remote pointing to your GitHub repo. You can call it `github` or `myfork`.

---

### **4. Push the cloned repo to GitHub**

```bash
git push github main
```

* Replace `main` with `master` if that’s the default branch.
* Now, your GitHub repo has a copy of the GitLab code.

---

### **5. Keep the original GitLab repo as upstream**

```bash
git remote add upstream https://gitlab.wikimedia.org/repos/wmde/wikidata-query-builder.git
```

* Now you have **two remotes**:

  * `github` → your fork on GitHub (your code goes here)
  * `upstream` → official GitLab repo (for updates)

---

### **6. Fetch updates from the original GitLab repo**

Whenever you want to get new updates from the official project:

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

* This merges the latest changes from GitLab into your local branch.
* Resolve conflicts if needed, then push the updated code to GitHub:

```bash
git push github main
```

---

### **7. Workflow for your development**

* Make all your custom features in branches locally, then push them to GitHub:

```bash
git checkout -b feature/my-new-query
# make changes
git commit -am "Add new query functionality"
git push github feature/my-new-query
```

* Later, merge your feature branch into `main` locally or via GitHub PR if desired.

---

✅ **Advantages of this setup**:

* You can develop freely in your GitHub repo.
* You can still pull updates from the official GitLab repo.
* You don’t need a GitLab account with special privileges.

---

💡 **Tip**: If you want, you can even set up **GitHub Actions** to automatically fetch updates from GitLab weekly and create a pull request with them to your GitHub repo. That’s more advanced but fully automatable.

---

If you want, I can also provide a **diagram showing this workflow**, so you can see clearly how `origin`, `upstream`, and `github` interact. It’s very helpful for long-term maintenance.

Do you want me to create that diagram?
