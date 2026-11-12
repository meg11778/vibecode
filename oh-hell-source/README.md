# Oh Hell: source

Source for the two pages published from this repository, `ohhell.html` (bid
calculator) and `ohhell-play.html` (play against the bots). Based on Jim
Agniel's Oh Hell calculator (github.com/agniel/vibecode), GPL v3; modified by
Matt Glassman, 2026. Everything here is under the GNU GPL v3.

- `engine/` - the working folder. `README.md` there records every measurement.
  - `ohhell.html` (in the repository root) is edited directly; its engine lies
    between the markers `===== cards:` and `===== UI =====`.
  - `ohhell-play.html` is built: `python3 build_play.py` joins
    `play_template.html`, `simbid_block.js` and the calculator's engine section.
    Put a copy of `ohhell.html` in `engine/` first.
  - `net_best.json` (4 players with trump) and `net2_best.json` (4 players no
    trump, 5 and 6 players) are the networks; `node embed.js` packs them into
    `netdata.js` / `netdata2.js`, which are pasted into `ohhell.html`.
  - `node assertions.js ohhell.html` runs the calculator's 58 checks.
- `train-network-1/`, `train-network-2/` - the folders used for the last
  self-play run of each network (`node overnight.js`; needs Node and Python
  with NumPy). Each starts from `net_weights.json`, which is a copy of the
  matching network in `engine/`.
