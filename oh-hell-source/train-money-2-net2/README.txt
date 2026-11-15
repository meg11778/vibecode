OH HELL - TRAINING RUN, SECOND NETWORK
======================================

What this is
  This trains the second card-playing network (no trump, five and six players). This
  folder trains it further by having it play hands against itself. It only uses
  the processor (not the graphics card), runs entirely inside this folder, and
  does not need the internet once the two programs below are installed.

One-time setup (Windows)
  1. Install Node.js: go to https://nodejs.org , download the "LTS" installer,
     run it, and accept the defaults.
  2. Install Python: go to https://www.python.org/downloads/ , download the
     installer, run it, and TICK THE BOX "Add python.exe to PATH" on the first
     screen before clicking Install.
  3. Install NumPy (a maths library for Python): press the Windows key, type
     cmd, press Enter. In the black window type this and press Enter:
         python -m pip install numpy
  4. Check both work. In the same window type each line and press Enter:
         node --version
         python --version
     Each should print a version number. If either says "not recognized",
     close the window, open a new one and try again; if it still fails,
     reinstall that program.

Running it
  1. Unzip this folder somewhere easy to find, for example the Desktop.
  2. Open the folder in File Explorer. Click in the address bar at the top,
     type cmd and press Enter. A black window opens, already in this folder.
  3. Type this and press Enter (16 is the number of hours; any number works):
         node overnight.js 16
  4. Leave the computer on. Stop it going to sleep: Settings > System >
     Power > Screen and sleep > set "put my device to sleep" to Never while it
     runs. The screen can turn off.

  It prints a block of results about once an hour (one "generation"). The
  computer will be busy but usable; it leaves four processor threads free.

Stopping and starting
  To stop early, click the black window and press Ctrl+C. Nothing is lost
  beyond the generation in progress. Running the same command again carries
  on from where it stopped.

When it finishes (or whenever you stop it)
  Send Matt these two files:
      net_best.json          (in this folder, about 1.2 MB)
      gens\log.txt           (inside the "gens" folder)

  The "gens" folder can grow to a few hundred MB; delete the whole folder
  when Matt confirms he has the two files.

Licence
  Built on Jim Agniel's Oh Hell bid calculator (GNU GPL v3), modified by Matt
  Glassman. The source is at github.com/meg11778/vibecode .
