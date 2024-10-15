# Dope Crash
 Fett kul spel man blir sjukt beroende


Game Board:
- An 8x8 grid of tiles.
- Each tile is either:
  - A regular tile: represented by numbers from 0 to N (e.g., 0, 1, 2, ...).
  - A special tile: represented by 'BOMB'.

Objective:
- Match 3 or more adjacent tiles of the same type horizontally or vertically.
- Earn points for each tile matched.
- Reach the target score within the given moves or time limit to complete the level.

Tile Matching:
- When two adjacent tiles are swapped:
  - Check for matches in rows and columns.
    - Horizontal Match: 3 or more identical tiles in a row.
    - Vertical Match: 3 or more identical tiles in a column.
  - If a match is found:
    - Remove matched tiles from the board.
    - Tiles above fall down to fill empty spaces.
    - New random tiles fill in from the top.
    - Update the score based on the number of tiles matched.
    - If 4 or more tiles are matched:
      - Chance to create a special 'BOMB' tile at the match location.

Special Tiles:
- 'BOMB' Tile:
  - When clicked, it clears itself and all adjacent tiles (3x3 area).
  - Provides strategic advantage to the player.

Player Stats:
- Level: Current level number.
- Score: Total points accumulated.
- Target Score: Points needed to complete the current level.
- Moves Left: Number of moves remaining.
- Time Left: Time remaining (if the timer is active).
- Average Time Per Move: Average duration of player's moves.

Game Progression:
- Increase difficulty as levels advance by:
  - Increasing the variety of tile types (higher N).
  - Enabling a timer in higher levels.
  - Adjusting the chance of generating special tiles.

Boosts and Adjustments:
- Boosts can be provided to assist the player:
  - Extra Moves: Add additional moves.
  - Extra Time: Add more time to the timer.
  - Increase Special Tile Chance: Higher likelihood of creating 'BOMB' tiles.
  - Add Special Tile: Place a 'BOMB' tile directly on the board.

AI Assistant Role:
- Analyze player's performance and current board state.
- Decide on adjusting difficulty and providing boosts.
- Consider factors like:
  - Player's score relative to the target score.
  - Remaining moves or time.
  - Average time per move.
  - Board state complexity.
- Provide decisions in the following format:
  - "Difficulty Level: N"
  - "Boosts: [List of boosts]"
  - "Explanation: [Brief reasoning]"

---------------------------------------------------------------------------------------------------------


Approach
After Each Move:

After the player makes a move (either swapping tiles or activating a special tile), we'll analyze the game state.
Analyze Player's Progress:

Calculate the required average score per remaining move to reach the target score.
Compare it with the player's average score per move so far.
Determine if Boost Is Needed:

If the required average is significantly higher (e.g., 20% higher) than the player's average, we'll consider the player to be far from clearing the level.
Provide a Small Boost:

If the player is behind, we'll provide a small boost, such as:
Adding an extra move.
Increasing the chance of creating special tiles temporarily.
Directly giving a special tile on the board.
Integration:

Implement a new function analyzeGameAfterMove to perform this analysis.
Call this function after each move.
