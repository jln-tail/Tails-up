(function () {
  function slugify(text, fallback) {
    var slug = text
      .toLowerCase()
      .trim()
      .replace(/[\s]+/g, "-")
      .replace(/[^a-z0-9\-\u4e00-\u9fa5]/g, "")
      .replace(/\-+/g, "-")
      .replace(/^\-+|\-+$/g, "");

    return slug || fallback;
  }

  function buildToc() {
    var article = document.querySelector(".post-content");
    var toc = document.getElementById("post-toc");
    var nav = document.getElementById("post-toc-nav");

    if (!article || !toc || !nav) {
      return;
    }

    var headings = article.querySelectorAll("h2, h3");
    if (!headings.length) {
      toc.hidden = true;
      return;
    }

    var usedIds = {};
    var list = document.createElement("ul");
    list.className = "post-toc-list";

    headings.forEach(function (heading, index) {
      var level = heading.tagName.toLowerCase();
      var text = heading.textContent ? heading.textContent.trim() : "";
      if (!text) {
        return;
      }

      if (!heading.id) {
        var baseId = slugify(text, "section-" + (index + 1));
        var id = baseId;
        var count = 2;
        while (document.getElementById(id) || usedIds[id]) {
          id = baseId + "-" + count;
          count += 1;
        }
        heading.id = id;
      }

      usedIds[heading.id] = true;

      var item = document.createElement("li");
      item.className = "post-toc-item toc-" + level;

      var link = document.createElement("a");
      link.href = "#" + heading.id;
      link.textContent = text;

      item.appendChild(link);
      list.appendChild(item);
    });

    if (!list.children.length) {
      toc.hidden = true;
      return;
    }

    nav.appendChild(list);
    toc.hidden = false;

    var links = nav.querySelectorAll("a");
    var headingArray = Array.from(headings).filter(function (h) {
      return h.id;
    });

    function setActive() {
      var activeId = "";
      var offset = 120;

      for (var i = 0; i < headingArray.length; i += 1) {
        var rect = headingArray[i].getBoundingClientRect();
        if (rect.top - offset <= 0) {
          activeId = headingArray[i].id;
        } else {
          break;
        }
      }

      links.forEach(function (link) {
        var isActive = activeId && link.getAttribute("href") === "#" + activeId;
        link.classList.toggle("is-active", Boolean(isActive));
      });
    }

    document.addEventListener("scroll", setActive, { passive: true });
    setActive();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildToc);
  } else {
    buildToc();
  }
})();
