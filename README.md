# Murch Lab website

Source for <https://murchlab.github.io>. The site is built with [Jekyll](https://jekyllrb.com/) and hosted on GitHub Pages: every push to the default branch is rebuilt and published automatically, usually within a minute or two.

## Updating the publications list

All publications are written directly in [publications.html](publications.html), newest first.

1. Put a thumbnail image for the paper in `Images/publications/` (PNG or JPG, roughly square works best).
2. Open `publications.html` and copy an existing entry, one complete `<table class="publication"> … </table>` block.
3. Paste it at the top of the list, just below the `<div class="pageTitle">` line, so the new paper appears first.
4. Change the image path, authors, title and link(s):

```html
<table class="publication">
	<tr class="publicationHeader">
		<td class="img" rowspan="3">
			<img src="Images/publications/my_paper.png" alt="" width="100"/>
		</td>
	</tr>
	<tr class="publicationContent">
		<td>
		<p> First Author, Second Author, and Kater W. Murch
		<br><i>Title of the Paper</i>
		<br>
		<a href=https://arxiv.org/abs/XXXX.XXXXX>arXiv:XXXX.XXXXX (2026)</a>
		</p>
		</td>
	</tr>
</table>
```

When a preprint is published, keep the arXiv link and add the journal link next to it, for example:

```html
<a href=https://journals.aps.org/prl/abstract/10.1103/xxxx>Phys. Rev. Lett. <b>135</b>, 080601 (2025)</a>, <a href=https://arxiv.org/abs/2503.01847>arXiv:2503.01847 (2025)</a>
```

## Updating the people list

The Personnel page ([personnel.html](personnel.html)) only sets the layout. The roster itself lives in [_data/people.yml](_data/people.yml), split into these sections, shown in this order:

| Section in `people.yml` | Heading on the page |
| --- | --- |
| `pi` | Principal investigator |
| `postdocs` | Post-docs |
| `grad_students` | Graduate students |
| `undergrad_students` | Undergraduate students |
| `former_postdocs` | Former post-docs |
| `former_grad_students` | Former graduate students |

- **Add someone:** copy an existing entry into the right section and edit it.
- **Remove someone:** delete their entry.
- **Move someone** (e.g. a student who graduated): cut their entry and paste it into the other section, such as from `grad_students` to `former_grad_students`.

An entry looks like this:

```yaml
  - name: Jane Smith
    photo: People/smith.jpg      # optional; leave out if there is no photo yet
    width: 300                   # optional, default 300
    height: 300                  # optional, default 300
    bio: |
      A short paragraph about Jane. HTML is allowed.
      <br>
      <a href="https://scholar.google.com/...">Google Scholar</a>
```

Notes:

- Put photos in the `People/` folder. A square photo looks best (it is shown at 300 × 300 px by default).
- Keep the `|` after `bio:` and indent every line of the bio by the same amount, more than `bio:` itself. YAML is sensitive to indentation, so a misaligned line can break the page; build locally (below) to check.
- Only `name` is required.

## Building locally

You only need this to preview changes before pushing; GitHub Pages builds the live site on its own.

**Requirements:** Ruby (3.x or newer) and Bundler. On macOS:

```sh
brew install ruby
gem install bundler
```

**First time only**, install the dependencies from the repository folder (they go into `vendor/bundle`, which is git-ignored):

```sh
bundle config set --local path vendor/bundle
bundle install
```

**Run the site:**

```sh
bundle exec jekyll serve
```

Then open <http://localhost:4000>. Jekyll rebuilds automatically when you save a file; refresh the browser to see the change. Edits to `_config.yml` need a restart (Ctrl+C, then run the command again).

The built site goes into `_site/`, which is git-ignored. Do not edit files there.

## Other pages

- Top menu: [_data/navigation.yml](_data/navigation.yml)
- Page layout and shared header/footer: [_layouts/](_layouts/) and [_includes/](_includes/)
- Styles: [CSS/](CSS/)
- Theses and data files linked from the site: [docs/](docs/)
