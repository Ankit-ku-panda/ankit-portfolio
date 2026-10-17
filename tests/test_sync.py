"""Privacy and discovery regressions; no network access is used by these tests."""

import json
import tempfile
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts import sync_github


class Discovery(unittest.TestCase):
    def setUp(self):
        self.patch_images = patch.object(
            sync_github, "repository_image_paths", return_value=[]
        )
        self.patch_pins = patch.object(sync_github, "public_pins", return_value=[])
        self.patch_images.start()
        self.patch_pins.start()
        self.addCleanup(self.patch_images.stop)
        self.addCleanup(self.patch_pins.stop)
        self.config = {"exclude_repos": ["ptcg-agent"], "include_forks": True}
        self.repo = {
            "name": "new-project",
            "full_name": "Ankit-ku-panda/new-project",
            "private": False,
            "visibility": "public",
            "fork": False,
            "default_branch": "main",
        }

    def test_private_and_excluded_never_pass(self):
        self.assertTrue(sync_github.permitted(self.repo, self.config))
        self.assertFalse(
            sync_github.permitted({**self.repo, "private": True}, self.config)
        )
        self.assertFalse(
            sync_github.permitted({**self.repo, "visibility": "private"}, self.config)
        )
        self.assertFalse(
            sync_github.permitted({**self.repo, "name": "ptcg-agent"}, self.config)
        )
        self.assertFalse(
            sync_github.permitted({**self.repo, "name": "PTCG-Agent"}, self.config)
        )

    def test_repository_pagination(self):
        with patch.object(
            sync_github, "api", side_effect=[[self.repo] * 100, [self.repo]]
        ) as request:
            self.assertEqual(len(sync_github.list_public_repos("Ankit-ku-panda")), 101)
            self.assertIn("page=2", request.call_args.args[0])

    def test_images_must_belong_to_repository(self):
        self.assertEqual(
            sync_github.image_candidate(
                self.repo, "![x](https://example.com/image.png)"
            ),
            "",
        )
        self.assertEqual(
            sync_github.image_candidate(self.repo, "![x](../private.png)"), ""
        )
        self.assertEqual(
            sync_github.image_candidate(self.repo, "![x](docs/preview.png)"),
            "docs/preview.png",
        )
        self.assertEqual(
            sync_github.image_candidate(
                self.repo,
                "![x](https://raw.githubusercontent.com/Ankit-ku-panda/new-project/main/docs/preview.png)",
            ),
            "docs/preview.png",
        )

    def test_new_public_repository_appears_without_manual_entry(self):
        repo = {
            **self.repo,
            "description": "A newly pushed public project.",
            "html_url": "https://github.com/Ankit-ku-panda/new-project",
            "language": "Python",
            "topics": ["automation"],
        }
        with patch.object(
            sync_github,
            "readme",
            return_value=(
                "# New project\nUseful README content.",
                "https://raw.githubusercontent.com/Ankit-ku-panda/new-project/main/",
            ),
        ):
            project, report = sync_github.make_project(repo, self.config)
        self.assertEqual(project["repo"], repo["html_url"])
        self.assertIn("Useful README content", project["details"])
        self.assertEqual(project["image"], "")
        self.assertEqual(project["tags"], ["Python", "automation"])

    def test_sync_keeps_local_profile_and_messages(self):
        import server
        from scripts import build_public

        original = json.loads(
            (sync_github.ROOT / "content/portfolio.json").read_text(encoding="utf-8")
        )
        repo = {
            **self.repo,
            "description": "A new public project.",
            "html_url": "https://github.com/Ankit-ku-panda/new-project",
            "language": "Python",
            "topics": [],
        }
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "content").mkdir()
            (root / "content/portfolio.json").write_text(
                json.dumps(original), encoding="utf-8"
            )
            (root / "content/github-sync.json").write_text(
                json.dumps({**self.config, "owner": "Ankit-ku-panda"}), encoding="utf-8"
            )
            with patch.object(server, "DB", root / "local.db"), patch.object(
                sync_github, "ROOT", root
            ), patch.object(
                sync_github,
                "list_public_repos",
                return_value=[repo, {**repo, "private": True, "name": "private-test"}],
            ), patch.object(
                sync_github, "readme", return_value=("", "")
            ), patch.object(
                build_public, "build_public"
            ):
                server.init_db()
                with server.connect() as database:
                    saved = original.copy()
                    saved["profile"] = {
                        **original["profile"],
                        "name": "My edited profile",
                    }
                    database.execute(
                        "UPDATE content SET body=? WHERE id=1", (json.dumps(saved),)
                    )
                    database.execute(
                        "INSERT INTO messages(name,email,message) VALUES(?,?,?)",
                        ("Visitor", "visitor@example.com", "Keep this message"),
                    )
                sync_github.sync(update_db=True)
                with server.connect() as database:
                    saved = json.loads(
                        database.execute(
                            "SELECT body FROM content WHERE id=1"
                        ).fetchone()[0]
                    )
                    self.assertEqual(saved["profile"]["name"], "My edited profile")
                    self.assertEqual(len(saved["projects"]), 1)
                    self.assertEqual(
                        database.execute("SELECT COUNT(*) FROM messages").fetchone()[0],
                        1,
                    )

    def test_pins_come_first_and_keep_profile_order(self):
        repos = [
            self.repo,
            {**self.repo, "name": "last", "full_name": "Ankit-ku-panda/last"},
            {**self.repo, "name": "second", "full_name": "Ankit-ku-panda/second"},
        ]
        ordered = sync_github.sorted_repositories(
            repos,
            ["Ankit-ku-panda/last", "Ankit-ku-panda/second"],
            [self.repo["full_name"]],
        )
        self.assertEqual(
            [repo["name"] for repo in ordered], ["last", "second", "new-project"]
        )

    def test_parse_real_public_pin_links(self):
        parser = sync_github.PinnedRepoParser()
        markup = (
            "<a href='/Ankit-ku-panda/demo' data-hydro-click='"
            + json.dumps({"payload": {"target": "PINNED_REPO"}})
            + "'>Demo</a>"
        )
        parser.feed(markup)
        self.assertEqual(parser.names, ["Ankit-ku-panda/demo"])

    def test_no_photo_card_has_no_visual_or_placeholder(self):
        from scripts import build_public

        project = {
            "title": "No photo",
            "repo": "https://github.com/Ankit-ku-panda/demo",
            "image": "",
            "tags": [],
            "summary": "Content only.",
            "category": "Tools",
        }
        card = build_public.project_html(project, 0)
        self.assertNotIn("<img", card)
        self.assertNotIn("image-button", card)
        self.assertNotIn("repo-cover", card)
        self.assertIn("Content only.", card)

    def test_image_search_looks_through_repository_tree(self):
        # Stop the guard for this one test; mock the public tree response instead.
        self.patch_images.stop()
        with patch.object(
            sync_github,
            "api",
            return_value={
                "tree": [
                    {"type": "blob", "path": "docs/screenshots/application.png"},
                    {"type": "blob", "path": "node_modules/library/icon.png"},
                ]
            },
        ):
            paths = sync_github.repository_image_paths(self.repo, "")
        self.assertEqual(paths, ["docs/screenshots/application.png"])


if __name__ == "__main__":
    unittest.main()
