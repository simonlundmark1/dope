'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { css, keyframes } from '@emotion/react';
import Image from 'next/image';
import explosionGif from '../assets/explosion.gif'; // Ensure this path is correct
import starImage from '../assets/star.png'; // Ensure this path is correct
import blackStarImage from '../assets/blackstar.png'; // Ensure this path is correct
import benderImage from '../assets/Bender.png'; // Ensure this path is correct

// Importing additional icons
import {
  Beer,
  Pizza,
  DollarSign,
  Cigarette,
  Gamepad2,
  Coffee,
  Smartphone,
  ShoppingBag,
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import OpenAI from 'openai'; // Import OpenAI

// Updated ICONS array with more icons
const ICONS = [
  Cigarette,
  Beer,
  Pizza,
  DollarSign,
  Gamepad2,
  Coffee,
  Smartphone,
  ShoppingBag,
];

// Updated ICON_COLORS array with more colors
const ICON_COLORS = [
  'bg-red-400',
  'bg-yellow-400',
  'bg-green-400',
  'bg-blue-400',
  'bg-purple-400',
  'bg-pink-400',
  'bg-indigo-400',
  'bg-teal-400',
];

// Constants for token cost
const COST_INPUT_PER_1000_TOKENS = 0.0015;
const COST_OUTPUT_PER_1000_TOKENS = 0.002;

const LEVEL_SCORE = 1200;

export function ColorfulHabitsCrush() {
  const [board, setBoard] = useState<(string | null)[][]>([]);
  const [selectedIcon, setSelectedIcon] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(10);
  const [initialMoves, setInitialMoves] = useState(10); // New state to track initial moves
  const [level, setLevel] = useState(1);
  const [targetScore, setTargetScore] = useState(1000);  // Changed initial value to 1000
  const [timeLeft, setTimeLeft] = useState(60); // Time limit
  const [gameOver, setGameOver] = useState(false);
  const [winPopup, setWinPopup] = useState(false);
  const [matches, setMatches] = useState<{ row: number; col: number }[]>([]);
  const [animatingSwap, setAnimatingSwap] =
    useState<[number, number, number, number] | null>(null);
  const [newTiles, setNewTiles] = useState<{ [key: string]: boolean }>({});
  const [maxDraws, setMaxDraws] = useState(10); // Limit draws
  const [flyingStars, setFlyingStars] = useState<{ id: number; style: any }[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const [starRating, setStarRating] = useState(0);
  const [winningPhrase, setWinningPhrase] = useState('');
  const [specialTiles, setSpecialTiles] = useState<
    { row: number; col: number; type: string }[]
  >([]);
  const [obstaclesEnabled, setObstaclesEnabled] = useState(false); // New mechanic

  // Add new state variables
  const [aiDifficulty, setAiDifficulty] = useState(2);
  const [aiCommentary, setAiCommentary] = useState('');
  const [openai, setOpenai] = useState<OpenAI | null>(null);
  const [useTimer, setUseTimer] = useState(false);
  const [iconCount, setIconCount] = useState(4);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [matchSound] = useState(() =>
    typeof Audio !== 'undefined' ? new Audio('/sounds/match.mp3') : null
  );
  const [swapSound] = useState(() =>
    typeof Audio !== 'undefined' ? new Audio('/sounds/swap.mp3') : null
  );
  const [winSound] = useState(() =>
    typeof Audio !== 'undefined' ? new Audio('/sounds/win.mp3') : null
  );
  const [loseSound] = useState(() =>
    typeof Audio !== 'undefined' ? new Audio('/sounds/lose.mp3') : null
  );
  const [clickSound] = useState(() =>
    typeof Audio !== 'undefined' ? new Audio('/sounds/click.mp3') : null
  );
  const [explodeSound] = useState(() => {
    if (typeof Audio !== 'undefined') {
      const audio = new Audio('/sounds/explode.mp3');
      audio.preload = 'auto';
      return audio;
    }
    return null;
  });
  const [tickSound] = useState(() =>
    typeof Audio !== 'undefined' ? new Audio('/sounds/tick.mp3') : null
  );

  // State for tracking total time and move count
  const [totalMoveTime, setTotalMoveTime] = useState(0);
  const [moveCount, setMoveCount] = useState(0);
  const [moveStartTime, setMoveStartTime] = useState<number | null>(null);

  // Add a new state for the game over reason
  const [gameOverReason, setGameOverReason] = useState<string>('');

  // New state to manage special tile chance
  const [specialTileChance, setSpecialTileChance] = useState(() => {
    // Initial chance based on difficulty
    return Math.max(0.1, (10 - aiDifficulty) / 10);
  });

  // New state to track if AI has been asked for boosts
  const [hasAskedForBoost, setHasAskedForBoost] = useState(false);

  // New state variables for API call stats
  const [apiCallStats, setApiCallStats] = useState({
    totalCalls: 0,
    totalTokens: 0,
  });

  // New state to store the latest AI prompt
  const [latestAIPrompt, setLatestAIPrompt] = useState('');

  const [showAIInfo, setShowAIInfo] = useState(true);
  const [activeAITab, setActiveAITab] = useState<'prompt' | 'stats'>('prompt');

  const [floatingScores, setFloatingScores] = useState<{ id: number; x: number; y: number; score: number }[]>([]);

  const winningPhrases = [
    'Dopamine Rush!',
    'Euphoria!',
    'High Score High!',
    'Craving Crushed!',
  ];
  const starFlyOut = keyframes`
    0% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    50% {
      opacity: 1;
    }
    100% {
      transform: translate(var(--tx), var(--ty)) scale(0.5) rotate(var(--rotation));
      opacity: 0;
    }
  `;
  const styles = {
    starWrapper: css`
      position: fixed;
      width: 30px;
      height: 30px;
      z-index: 11;
      pointer-events: none;
      animation-fill-mode: forwards;
    `,
    tile: css`
      z-index: 1;
    `,
    matchedTile: css`
      z-index: 5;
    `,
    funkyPopup: css`
      clip-path: polygon(
        51% 0,
        40% 14%,
        21% 6%,
        25% 23%,
        5% 29%,
        20% 41%,
        6% 59%,
        25% 64%,
        29% 84%,
        49% 74%,
        64% 87%,
        74% 69%,
        89% 69%,
        81% 52%,
        96% 36%,
        77% 26%,
        86% 7%,
        63% 14%
      );
      background: #f45c19;
      filter: drop-shadow(5px 5px 5px black);
      box-shadow: none;
      padding: 20px;
      position: absolute;
      width: 28%;
      height: 55%;
      top: 30%;
      left: 36%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    `,
  };

  // Add this keyframe for the jumping animation
  const jump = keyframes`
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  `;

  // Update the timeLeftStyle
  const timeLeftStyle = css`
    color: ${timeLeft <= 10 ? 'red' : 'white'};
    font-weight: ${timeLeft <= 10 ? 'bold' : 'normal'};
    font-size: ${timeLeft <= 10 ? '1.5em' : '1em'};
    display: inline-block;
    animation: ${useTimer ? `${jump} 0.5s ease infinite` : 'none'};
  `;

  // Updated getRandomIcon to add new icon every other level
  const getRandomIcon = () => {
    return Math.floor(Math.random() * iconCount).toString();
  };

  const initializeBoard = () => {
    const newBoard = Array(8)
      .fill(null)
      .map(() => Array(8).fill(null).map(() => getRandomIcon()));
    setBoard(newBoard);
  };

  const playSound = useCallback(
    (sound: HTMLAudioElement | null) => {
      if (isSoundEnabled && sound) {
        sound.currentTime = 0;
        sound
          .play()
          .then(() => {
            console.log('Sound played successfully');
          })
          .catch((error) => {
            console.error('Error playing sound:', error);
          });
      }
    },
    [isSoundEnabled]
  );

  const clearMatches = useCallback(
    (matchesToClear: { row: number; col: number }[]) => {
      const newBoard = [...board];

      matchesToClear.forEach(({ row, col }) => {
        newBoard[row][col] = null;
      });

      setBoard(newBoard);
    },
    [board]
  );

  const shiftIconsDown = useCallback(() => {
    const newBoard = [...board];
    for (let col = 0; col < 8; col++) {
      let emptyRow = 7;
      for (let row = 7; row >= 0; row--) {
        if (newBoard[row][col] !== null) {
          newBoard[emptyRow][col] = newBoard[row][col];
          if (emptyRow !== row) {
            newBoard[row][col] = null;
          }
          emptyRow--;
        }
      }
    }
    setBoard(newBoard);
  }, [board]);

  const addNewIcons = useCallback(() => {
    const newBoard = [...board];
    const newTilesObj: { [key: string]: boolean } = {};
    for (let col = 0; col < 8; col++) {
      for (let row = 7; row >= 0; row--) {
        if (newBoard[row][col] === null) {
          newBoard[row][col] = getRandomIcon();
          newTilesObj[`${row}-${col}`] = true;
        }
      }
    }
    setBoard(newBoard);
    setNewTiles(newTilesObj);

    // Clear newTiles after animation
    setTimeout(() => setNewTiles({}), 500);
  }, [board]);

  const [bigText, setBigText] = useState<string | null>(null);

  const excitingPhrases = [
    "SUPER!",
    "AWESOME!",
    "EXTREME!",
    "INCREDIBLE!",
    "PHENOMENAL!",
    "MIND-BLOWING!",
    "LEGENDARY!",
    "GODLIKE!"
  ];

  const updateScore = (matchCount: number) => {
    let baseScore = matchCount * 10;
    let bonus = 0;
    
    // Calculate bonus for matches larger than 3
    if (matchCount > 3) {
      bonus = (matchCount - 3) * 20; // 20 points extra for each tile beyond 3
    }
    
    const totalScore = baseScore + bonus;
    setScore((prevScore) => prevScore + totalScore);
    
    // Display big text for large matches
    if (matchCount >= 7 && !bigText) {
      const phraseIndex = Math.min(matchCount - 7, excitingPhrases.length - 1);
      setBigText(excitingPhrases[phraseIndex]);
      setTimeout(() => setBigText(null), 500); // Total duration of 1 second
    }
    
    // Add floating scores for each matched tile
    const scorePerTile = Math.round(totalScore / matchCount);
    const newFloatingScores = matches.map(({ row, col }) => {
      const tileElement = gridRef.current?.children[row * 8 + col] as HTMLElement;
      const tileRect = tileElement?.getBoundingClientRect();
      return {
        id: Date.now() + Math.random(),
        x: tileRect ? tileRect.left + tileRect.width / 2 : 0,
        y: tileRect ? tileRect.top + tileRect.height / 2 : 0,
        score: scorePerTile,
      };
    });
    setFloatingScores((prev) => [...prev, ...newFloatingScores]);

    // Remove floating scores after animation
    setTimeout(() => {
      setFloatingScores((prev) => prev.filter((fs) => !newFloatingScores.includes(fs)));
    }, 2000);
  };

  useEffect(() => {
    if ((moves <= 0 || (useTimer && timeLeft <= 0)) && !winPopup) {
      setGameOver(true);
      setUseTimer(false);
      setGameOverReason(moves <= 0 ? 'No moves left' : 'Time ran out');
    }
  }, [moves, timeLeft, useTimer, winPopup]);

  useEffect(() => {
    initializeBoard();
  }, []); // Empty dependency array to run only once

  const checkForMatches = useCallback(() => {
    if (board.length === 0) return;

    const newMatches: { row: number; col: number }[] = [];
    const newSpecialTiles: { row: number; col: number; type: string }[] = [];

    // Move shouldCreateSpecialTile inside useCallback
    const shouldCreateSpecialTile = () => {
      const chance = specialTileChance; // Use the updated special tile chance
      return Math.random() < chance;
    };

    // Check for horizontal matches
    for (let i = 0; i < 8; i++) {
      let matchLength = 1;
      for (let j = 0; j < 8; j++) {
        if (j < 7 && board[i][j] === board[i][j + 1] && board[i][j] !== null) {
          matchLength++;
        } else {
          if (matchLength >= 3) {
            for (let k = 0; k < matchLength; k++) {
              newMatches.push({ row: i, col: j - k });
            }
            // Create special tile if matchLength >= 4
            if (matchLength >= 4 && shouldCreateSpecialTile()) {
              newSpecialTiles.push({
                row: i,
                col: j - Math.floor(matchLength / 2),
                type: 'BOMB',
              });
            }
          }
          matchLength = 1;
        }
      }
    }

    // Check for vertical matches
    for (let j = 0; j < 8; j++) {
      let matchLength = 1;
      for (let i = 0; i < 8; i++) {
        if (i < 7 && board[i][j] === board[i + 1][j] && board[i][j] !== null) {
          matchLength++;
        } else {
          if (matchLength >= 3) {
            for (let k = 0; k < matchLength; k++) {
              newMatches.push({ row: i - k, col: j });
            }
            // Create special tile if matchLength >= 4
            if (matchLength >= 4 && shouldCreateSpecialTile()) {
              newSpecialTiles.push({
                row: i - Math.floor(matchLength / 2),
                col: j,
                type: 'BOMB',
              });
            }
          }
          matchLength = 1;
        }
      }
    }

    setMatches(newMatches);
    setSpecialTiles(newSpecialTiles);
  }, [board, specialTileChance]); // Add specialTileChance to dependencies

  useEffect(() => {
    if (board.length > 0) {
      checkForMatches();
    }
  }, [board, checkForMatches]);

  useEffect(() => {
    if (matches.length > 0) {
      matches.forEach(({ row, col }) => {
        addFlyingStars(row, col);
      });

      playSound(explodeSound);

      const timer = setTimeout(() => {
        const newBoard = [...board];

        // Clear matches
        matches.forEach(({ row, col }) => {
          newBoard[row][col] = null;
        });

        // Place special tiles on the board
        specialTiles.forEach(({ row, col, type }) => {
          newBoard[row][col] = type;
        });

        setBoard(newBoard);
        shiftIconsDown();
        addNewIcons();

        updateScore(matches.length);
        setMatches([]);
        setSpecialTiles([]);
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [
    matches,
    board,
    specialTiles,
    shiftIconsDown,
    addNewIcons,
    playSound,
    explodeSound,
  ]);

  const handleIconClick = (row: number, col: number) => {
    if (gameOver || winPopup) return;

    playSound(clickSound);

    // Start move timer
    setMoveStartTime(Date.now());

    if (isSpecialTile(board[row][col])) {
      activateSpecialTile(row, col);
      setMoves((prev) => prev - 1);
      return;
    }

    if (!selectedIcon) {
      setSelectedIcon([row, col]);
    } else {
      const [selectedRow, selectedCol] = selectedIcon;
      if (
        (Math.abs(row - selectedRow) === 1 && col === selectedCol) ||
        (Math.abs(col - selectedCol) === 1 && row === selectedRow)
      ) {
        handleSwap(selectedRow, selectedCol, row, col);
        setMoves((prev) => prev - 1);
      }
      setSelectedIcon(null);
    }
  };

  const isSpecialTile = (tile: string | null) => {
    return tile === 'BOMB';
  };

  const activateSpecialTile = (row: number, col: number) => {
    if (board[row][col] === 'BOMB') {
      const positionsToClear = getSurroundingPositions(row, col);
      positionsToClear.push({ row, col }); // Include the special tile itself
      setMatches(positionsToClear);
      playSound(explodeSound);
      // Moves decremented in handleIconClick
    }
  };

  const getSurroundingPositions = (row: number, col: number) => {
    const positions = [];
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          positions.push({ row: r, col: c });
        }
      }
    }
    return positions;
  };

  // Function to add a special tile directly to the board
  const addSpecialTileToBoard = () => {
    const newBoard = [...board];
    // Find a random non-null position
    let placed = false;
    for (let attempt = 0; attempt < 10 && !placed; attempt++) {
      const row = Math.floor(Math.random() * 8);
      const col = Math.floor(Math.random() * 8);
      if (newBoard[row][col] !== null && !isSpecialTile(newBoard[row][col])) {
        newBoard[row][col] = 'BOMB';
        placed = true;
      }
    }
    if (placed) {
      setBoard(newBoard);
    }
  };

  const analyzeGameAfterMove = useCallback(() => {
    const movesUsed = initialMoves - moves;
    const remainingMoves = moves;
    const requiredScore = targetScore - score;

    // If the player has already met or exceeded the target score, no need to analyze
    if (requiredScore <= 0) return;

    // Calculate required average score per remaining move
    const requiredAverageScore = requiredScore / remainingMoves;

    // Calculate player's average score per move so far
    const averageScoreSoFar = score / movesUsed || 0;

    // If required average is significantly higher than average so far, player is behind
    if (requiredAverageScore > averageScoreSoFar * 1.5) {
      // Provide a small boost
      // Temporarily increase special tile chance
      setSpecialTileChance((prev) => Math.min(prev + 0.1, 0.5));

      // Optionally, add a special tile directly to the board
      addSpecialTileToBoard();

      // Provide AI commentary
      setAiCommentary("Here's a little boost to help you out!");
    }
  }, [initialMoves, moves, score, targetScore, setSpecialTileChance, addSpecialTileToBoard, setAiCommentary]);

  const handleSwap = useCallback(
    (row1: number, col1: number, row2: number, col2: number) => {
      if (gameOver || winPopup) return;

      setAnimatingSwap([row1, col1, row2, col2]);

      setTimeout(() => {
        const newBoard = [...board];
        [newBoard[row1][col1], newBoard[row2][col2]] = [
          newBoard[row2][col2],
          newBoard[row1][col1],
        ];
        setBoard(newBoard);
        setAnimatingSwap(null);

        setTimeout(() => {
          checkForMatches();
          // Moves decremented in handleIconClick
          // Calculate total move time and count
          if (moveStartTime) {
            const moveTime = Date.now() - moveStartTime;
            setTotalMoveTime((prevTotal) => prevTotal + moveTime);
            setMoveCount((prevCount) => prevCount + 1);
            setMoveStartTime(null);
          }

          // Analyze game after move
          analyzeGameAfterMove();
        }, 300);
      }, 300);

      playSound(swapSound);
    },
    [
      board,
      checkForMatches,
      gameOver,
      winPopup,
      playSound,
      swapSound,
      moveStartTime,
      analyzeGameAfterMove,
    ]
  );

  // Function to generate the compressed board state string
  const getBoardStateString = useCallback(() => {
    return board
      .map((row) =>
        row
          .map((tile) => {
            if (tile === 'BOMB') return 'B';
            return tile;
          })
          .join('')
      )
      .join('\n');
  }, [board]);

  // Updated analyzeGameForBoosts function
  const analyzeGameForBoosts = useCallback(async () => {
    if (!openai) return;

    try {
      const averageTimePerMoveInSeconds =
        moveCount > 0 ? totalMoveTime / moveCount / 1000 : 0;

      const boardStateString = getBoardStateString();

      const promptContent = `Player stats:
Level: ${level}
Score: ${score}
Moves Left: ${moves}
Time Left: ${timeLeft}
Average Time Per Move: ${averageTimePerMoveInSeconds.toFixed(2)} seconds

Board State:
${boardStateString}

Legend:
- Numbers 0-${iconCount - 1}: Regular tiles
- 'B': Bomb (special tile)

Given the player's performance, score, moves left, and current board state, should we offer an extra move or bonus tile?`;

      // Update the latest AI prompt
      setLatestAIPrompt(promptContent);

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an AI game assistant for a tile-matching game. The board is an 8x8 grid where each tile is represented by a number or a special character. Analyze the player's performance and the board state to decide whether to provide a boost. Respond with "Boost: Yes" or "Boost: No" and provide a brief reason in 1-2 sentences. If the boost is Yes, specify whether it should be an extra move or a bonus tile.`,
          },
          {
            role: 'user',
            content: promptContent,
          },
        ],
        max_tokens: 150,
      });

      // Log token usage
      console.log('Tokens used:', response.usage?.total_tokens);

      // Update API call stats
      setApiCallStats(prevStats => ({
        totalCalls: prevStats.totalCalls + 1,
        totalTokens: prevStats.totalTokens + (response.usage?.total_tokens || 0),
      }));

      const aiDecision = response.choices[0].message?.content || '';
      console.log('AI Boost Decision:', aiDecision);

      const boostMatch = aiDecision.match(/Boost:\s*(Yes|No)/i);
      const explanationMatch = aiDecision.match(/Boost:\s*(?:Yes|No)\s*[\n\r]*(.+)/s);

      if (boostMatch) {
        const boostDecision = boostMatch[1].toLowerCase();
        if (boostDecision === 'yes') {
          // Apply boosts
          if (aiDecision.toLowerCase().includes('extra move')) {
            setMoves(moves => moves + 1);
            setAiCommentary('Here\'s an extra move to help you out!');
          } else if (aiDecision.toLowerCase().includes('bonus tile')) {
            setSpecialTileChance((prev) => Math.min(prev + 0.2, 0.7)); // Increase special tile chance
            addSpecialTileToBoard(); // Add a special tile to the board
            setAiCommentary('I\'ve added a bonus special tile to the board!');
          } else {
            setSpecialTileChance((prev) => Math.min(prev + 0.2, 0.7)); // Increase special tile chance
            addSpecialTileToBoard(); // Add a special tile to the board
            setAiCommentary(
              explanationMatch
                ? explanationMatch[1].trim()
                : 'Providing a boost to assist you!'
            );
          }
        } else {
          // Do not apply boosts
          setAiCommentary(
            explanationMatch
              ? explanationMatch[1].trim()
              : 'No boosts will be provided at this time.'
          );
        }
      } else {
        console.warn('Boost decision not found in AI response.');
      }
    } catch (error) {
      console.error('Error analyzing game for boosts:', error);
    }
  }, [
    openai,
    level,
    score,
    moves,
    timeLeft,
    moveCount,
    totalMoveTime,
    iconCount,
    getBoardStateString,
    setApiCallStats,
    addSpecialTileToBoard,
  ]);

  const applyBoosts = useCallback((boosts: string[]) => {
    boosts.forEach((boost) => {
      if (boost.toLowerCase().includes('increase special tile chance')) {
        setSpecialTileChance((prev) => Math.min(prev + 0.05, 0.5)); // Smaller increase
      } else if (boost.toLowerCase().includes('add special tile')) {
        // 50% chance to actually add a special tile
        if (Math.random() < 0.5) {
          addSpecialTileToBoard();
        }
      } else if (boost.toLowerCase().includes('extra time') && useTimer) {
        setTimeLeft((prev) => prev + 15); // Reduced extra time
      }
    });
  }, [setSpecialTileChance, addSpecialTileToBoard, setTimeLeft, useTimer]);

  const adjustGameDifficulty = useCallback((difficulty: number) => {
    // Adjust icon count (more icons for higher difficulty, but less aggressively)
    const baseIconCount = 4;
    const maxIconCount = ICONS.length;
    const iconIncrease = Math.floor(difficulty / 5); // Increase icons every 3 levels of difficulty
    setIconCount(Math.min(baseIconCount + iconIncrease, maxIconCount));

    // Adjust timer usage (only enable timer for higher difficulties)
    setUseTimer(difficulty > 7);

    // Adjust special tile creation chance (less aggressive reduction)
    const baseChance = 0.2;
    const chanceReduction = 0.01 * difficulty;
    setSpecialTileChance(Math.max(0.05, baseChance - chanceReduction));
  }, [setIconCount, setUseTimer, setSpecialTileChance]);

  const analyzePerformance = useCallback(async () => {
    if (!openai) return;

    try {
      const averageTimePerMoveInSeconds =
        moveCount > 0 ? totalMoveTime / moveCount / 1000 : 0;

      const nextLevel = level + 1;
      const nextTargetScore = targetScore * 2;

      const promptContent = `Player stats:
Current Level: ${nextLevel}
Score: ${score}
Target Score: ${nextTargetScore}
Moves Left: ${moves}
Time Left: ${timeLeft}
Average Time Per Move: ${averageTimePerMoveInSeconds.toFixed(2)} seconds

Please provide any boosts or adjustments for this new level based on the player's performance in the previous level.`;

      // Update the latest AI prompt
      setLatestAIPrompt(promptContent);

      const systemMessage = `You are an AI game assistant. Analyze the player's performance in the previous level and decide whether to adjust the game difficulty or provide boosts for the current level ${nextLevel}. Respond with the new difficulty level between 1 (easiest) and 10 (hardest) in the format: "Difficulty Level: N". Then, provide any boosts in the format: "Boosts: [List of boosts]". Available boosts are: increase special tile chance, add special tile, extra time (if timer is used). Do not suggest extra moves. Provide a brief explanation for your decisions in 1-2 sentences.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: promptContent },
        ],
        max_tokens: 150,
      });

      // Log token usage
      console.log('Tokens used:', response.usage?.total_tokens);

      // Update API call stats
      setApiCallStats((prevStats) => ({
        totalCalls: prevStats.totalCalls + 1,
        totalTokens: prevStats.totalTokens + (response.usage?.total_tokens || 0),
      }));

      const aiDecision = response.choices[0].message?.content || '';
      console.log('AI Decision:', aiDecision);

      // Extract the difficulty level and boosts from AI's response
      const difficultyMatch = aiDecision.match(/Difficulty Level:\s*(\d+)/i);
      const boostsMatch = aiDecision.match(/Boosts:\s*(.+)/i);
      const explanationMatch = aiDecision.match(/(?:Explanation|Reason):\s*(.+)/i);

      if (difficultyMatch) {
        const suggestedDifficulty = parseInt(difficultyMatch[1], 10);
        // Limit the difficulty increase to a maximum of 2 levels at a time
        const newDifficulty = Math.min(aiDifficulty + 2, suggestedDifficulty);
        setAiDifficulty(newDifficulty);

        // Adjust game parameters based on new difficulty
        adjustGameDifficulty(newDifficulty);
      } else {
        console.warn('Difficulty level not found in AI response.');
      }

      if (boostsMatch) {
        const boosts = boostsMatch[1].trim().split(',').map((b) => b.trim());
        // Apply boosts based on the AI's suggestions
        applyBoosts(boosts);
      }

      // Set AI commentary including the explanation
      setAiCommentary(
        explanationMatch ? explanationMatch[1].trim() : 'No explanation provided.'
      );
    } catch (error) {
      console.error('Error analyzing performance:', error);
    }
  }, [
    openai,
    level,
    score,
    moves,
    timeLeft,
    targetScore,
    moveCount,
    totalMoveTime,
    setAiDifficulty,
    adjustGameDifficulty,
    setAiCommentary,
    setApiCallStats,
    setLatestAIPrompt,
    applyBoosts,
  ]);

  const nextLevel = useCallback(() => {
    setWinPopup(false);

    // Update level and target score first
    setLevel((prev) => prev + 1);
    setTargetScore((prev) => Math.floor(prev * 1.15));  // Increase by 15% for all levels

    // Then call analyzePerformance with the new values
    analyzePerformance();

    // Reset other game state
    setMoves(10);
    setInitialMoves(10);
    setScore(0);
    setTimeLeft(60);
    setUseTimer(false);
    setGameOver(false);
    setGameOverReason('');
    setHasAskedForBoost(false);
    setTotalMoveTime(0);
    setMoveCount(0);
    initializeBoard();
  }, [analyzePerformance, initializeBoard]);

  // UseEffect to check if moves or time are low and involve AI
  useEffect(() => {
    if (
      (moves <= 5 || (useTimer && timeLeft <= 30)) &&
      !hasAskedForBoost &&
      !gameOver &&
      !winPopup
    ) {
      analyzeGameForBoosts();
      setHasAskedForBoost(true);
    }
  }, [
    moves,
    timeLeft,
    hasAskedForBoost,
    useTimer,
    gameOver,
    winPopup,
    analyzeGameForBoosts,
  ]);

  // Reset hasAskedForBoost when moves or time increase
  useEffect(() => {
    if (moves > 5 && (!useTimer || timeLeft > 30)) {
      setHasAskedForBoost(false);
    }
  }, [moves, timeLeft, useTimer]);

  useEffect(() => {
    if (score >= targetScore) {
      // Calculate star rating based on moves used
      const movesUsed = initialMoves - moves;
      let stars = 1;
      if (movesUsed <= 3) {
        stars = 3;
      } else if (movesUsed <= 6) {
        stars = 2;
      }
      setStarRating(stars);

      // Select a random winning phrase
      const randomPhrase =
        winningPhrases[Math.floor(Math.random() * winningPhrases.length)];
      setWinningPhrase(randomPhrase);

      setWinPopup(true);
    }
  }, [score, targetScore, moves, initialMoves]);

  // Initialize OpenAI client
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API Key is not defined!');
      return;
    }

    const openaiClient = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Allows usage in the browser
    });

    setOpenai(openaiClient);
  }, []);
  
  const addFlyingStars = (row: number, col: number) => {
    if (!gridRef.current) return;

    const tileElement = gridRef.current.children[row * 8 + col] as HTMLElement;
    if (!tileElement) return;

    const tileRect = tileElement.getBoundingClientRect();

    const x = tileRect.left + tileRect.width / 2;
    const y = tileRect.top + tileRect.height / 2;

    const newStars = Array(5)
      .fill(null)
      .map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 300 + Math.random() * 200;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        const rotation = Math.random() * 720 - 360;
        const duration = 1.5; // Adjusted duration
        const delay = 0.5; // Added delay

        return {
          id: Date.now() + i + Math.random(),
          style: {
            position: 'fixed',
            top: `${y}px`,
            left: `${x}px`,
            '--tx': `${tx}px`,
            '--ty': `${ty}px`,
            '--rotation': `${rotation}deg`,
            animation: `${starFlyOut} ${duration}s ease-out ${delay}s`,
          },
          duration: (duration + delay) * 1000,
        };
      });

    setFlyingStars((prevStars) => [...prevStars, ...newStars]);

    newStars.forEach((star) => {
      setTimeout(() => {
        setFlyingStars((prevStars) => prevStars.filter((s) => s.id !== star.id));
      }, star.duration);
    });
  };

  // Add this useEffect to handle the ticking sound
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (useTimer && timeLeft > 0) {
      if (timeLeft === 60) {
        playSound(tickSound);
      }
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [useTimer, timeLeft, playSound, tickSound]);

  // Move calculateCost inside the component
  const calculateCost = useCallback((tokens: number) => {
    const inputTokens = tokens / 2;
    const outputTokens = tokens / 2;
    const inputCost = (inputTokens / 1000) * COST_INPUT_PER_1000_TOKENS;
    const outputCost = (outputTokens / 1000) * COST_OUTPUT_PER_1000_TOKENS;
    return inputCost + outputCost;
  }, []);

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-[#F4CA19] pt-4 relative overflow-hidden">
      {winPopup && (
        <div
          css={styles.funkyPopup}
          className="absolute z-50 flex flex-col justify-center items-center p-4"
        >
          <h1
            className="text-3xl font-bold text-white text-center"
            style={{ textShadow: '2px 2px black' }}
          >
            {winningPhrase}
          </h1>
          <div className="flex flex-col items-center mt-4">
            <span className="text-xl font-semibold text-white">Score:</span>
            <div className="flex justify-center mt-2">
              {[...Array(3)].map((_, index) => (
                <Image
                  key={index}
                  src={index < starRating ? starImage : blackStarImage}
                  alt="Star"
                  width={50}
                  height={50}
                  style={{ height: 'auto', width: '100%' }}
                />
              ))}
            </div>
          </div>
          <button
            className="bg-yellow-500 p-4 mt-4 rounded-full flex items-center justify-center"
            onClick={nextLevel}
            style={{ width: '60px', height: '60px' }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="white"
              xmlns="http://www.w3.org/2000/svg"
              width="36"
              height="36"
            >
              <path d="M8 5v14l11-7z"></path>
            </svg>
          </button>
        </div>
      )}
      {gameOver && (
        <div
          css={styles.funkyPopup}
          className="absolute z-50 flex flex-col justify-center items-center p-4"
        >
          <h1
            className="text-3xl font-bold text-white text-center"
            style={{ textShadow: '2px 2px black' }}
          >
            Game Over!
          </h1>
          <p className="text-xl text-white mt-2">{gameOverReason}</p>
          <button
            className="bg-red-500 p-4 mt-4 rounded-full flex items-center justify-center"
            onClick={() => {
              setGameOver(false);
              setLevel(1);
              setMoves(10);
              setInitialMoves(10); // Reset initial moves
              setScore(0);
              setTargetScore(1000);
              setGameOverReason('');
              setHasAskedForBoost(false); // Reset boost request state
              setTotalMoveTime(0); // Reset total move time
              setMoveCount(0); // Reset move count
              initializeBoard();
            }}
            style={{ width: '60px', height: '60px' }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="white"
              xmlns="http://www.w3.org/2000/svg"
              width="36"
              height="36"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10
                        10-4.48 10-10S17.52 2 12 2zm5 13H7v-2h10v2z"
              ></path>
            </svg>
          </button>
        </div>
      )}

      <div className="mb-2">
        <Image
          src="/images/logo.png"
          alt="Dope Crash Logo"
          width={800}
          height={100}
          style={{ height: 'auto', width: '100%' }}
          priority
        />
      </div>

      <div
        className="mb-5 text-xl font-semibold text-white"
        style={{
          textShadow:
            '2px 2px 0 black, -2px -2px 0 black, 2px -2px 0 black, -2px 2px 0 black',
        }}
      >
        Level: {level} | Score: {score} | Target: {targetScore} | Moves Left: {moves}
        {useTimer && <span css={timeLeftStyle}> | Time Left: {timeLeft}s</span>}
      </div>

      <div className="bg-white bg-opacity-50 p-4 rounded-lg shadow-lg backdrop-blur-md relative">
        <div ref={gridRef} className="grid grid-cols-8 gap-2 relative">
          {board.map((row, rowIndex) =>
            row.map((item, colIndex) => {
              const IconComponent = ICONS[parseInt(item || '0')];
              const iconColor = ICON_COLORS[parseInt(item || '0')];
              const isMatched = matches.some(
                (m) => m.row === rowIndex && m.col === colIndex
              );
              const isSwapping =
                animatingSwap &&
                ((animatingSwap[0] === rowIndex && animatingSwap[1] === colIndex) ||
                  (animatingSwap[2] === rowIndex && animatingSwap[3] === colIndex));
              const isNewTile = newTiles[`${rowIndex}-${colIndex}`];
              const isSpecial = isSpecialTile(item);

              const swapDirection = isSwapping
                ? animatingSwap![0] === rowIndex && animatingSwap![1] === colIndex
                  ? {
                      x: (animatingSwap![3] - animatingSwap![1]) * 56,
                      y: (animatingSwap![2] - animatingSwap![0]) * 56,
                    }
                  : {
                      x: (animatingSwap![1] - animatingSwap![3]) * 56,
                      y: (animatingSwap![0] - animatingSwap![2]) * 56,
                    }
                : { x: 0, y: 0 };

              return (
                <motion.div
                  key={`${rowIndex}-${colIndex}`}
                  className="w-12 h-12 relative"
                  layout
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <AnimatePresence mode="wait">
                    {!isMatched && (
                      <motion.button
                        key={`${item}-${rowIndex}-${colIndex}`}
                        className={`w-full h-full flex items-center justify-center rounded-lg ${
                          isSpecial ? 'bg-yellow-500' : iconColor
                        } hover:opacity-90 ${
                          selectedIcon &&
                          selectedIcon[0] === rowIndex &&
                          selectedIcon[1] === colIndex
                            ? 'ring-4 ring-white ring-opacity-60'
                            : ''
                        }`}
                        onClick={() => handleIconClick(rowIndex, colIndex)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        initial={
                          isNewTile ? { y: -100, opacity: 0 } : { y: 0, opacity: 1 }
                        }
                        animate={
                          isSwapping
                            ? { ...swapDirection, opacity: 1 }
                            : { x: 0, y: 0, opacity: 1 }
                        }
                        transition={{
                          type: 'spring',
                          stiffness: 300,
                          damping: 20,
                          delay: isNewTile ? rowIndex * 0.05 : 0,
                        }}
                        aria-label={`${item} at row ${rowIndex + 1}, column ${colIndex + 1}`}
                      >
                        {isSpecial ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="white"
                            width="24"
                            height="24"
                          >
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                          </svg>
                        ) : (
                          <IconComponent size={24} className="text-white" />
                        )}
                      </motion.button>
                    )}
                  </AnimatePresence>
                  {isMatched && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: '120%',
                        height: '120%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10,
                        pointerEvents: 'none',
                      }}
                    >
                      <Image
                        src={explosionGif}
                        alt="Explosion"
                        className="explosion"
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Render the flying stars */}
      {flyingStars.map((star) => (
        <div key={star.id} css={[styles.starWrapper, css(star.style)]}>
          <Image src={starImage} alt="Star" width={30} height={30} />
        </div>
      ))}

      {/* Render floating scores */}
      <AnimatePresence>
        {floatingScores.map((fs) => (
          <motion.div
            key={fs.id}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -100, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute text-white font-bold text-4xl z-50 pointer-events-none"
            style={{ 
              left: fs.x, 
              top: fs.y,
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            +{fs.score}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Big text for large matches */}
      <AnimatePresence>
        {bigText && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute text-8xl font-black text-yellow-300 z-50 text-center"
            style={{ 
              WebkitTextStroke: '4px black',
              position: 'absolute',
              top: '50%',
              left: 'calc(50% - 10vw)',
              transform: 'translate(-50%, -50%)'
            }}
          >
            {bigText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Combined AI Information Box */}
      <div
        className={`absolute bg-white bg-opacity-90 p-4 rounded-lg shadow-lg z-10 transition-all duration-300 ease-in-out ${
          showAIInfo ? 'left-2' : '-left-80'
        }`}
        style={{
          top: '10vh',
          maxWidth: '300px',
          maxHeight: '80vh',
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">AI Information</h2>
          <button
            onClick={() => setShowAIInfo(!showAIInfo)}
            className="text-gray-500 hover:text-gray-700"
          >
            {showAIInfo ? '◀' : '▶'}
          </button>
        </div>

        <div className="overflow-auto" style={{ maxHeight: 'calc(80vh - 100px)' }}>
          <h3 className="text-lg font-semibold mb-2">Prompt</h3>
          <pre className="text-xs whitespace-pre-wrap mb-4">{latestAIPrompt}</pre>

          <h3 className="text-lg font-semibold mb-2">API Stats</h3>
          <div>
            <p>Total Calls: {apiCallStats.totalCalls}</p>
            <p>Total Tokens Used: {apiCallStats.totalTokens}</p>
            <p>
              Total Cost: $
              {calculateCost(apiCallStats.totalTokens).toFixed(4)} USD
            </p>
          </div>
        </div>
      </div>

      {/* AI Commentary (unchanged position) */}
      <div
        className="absolute bg-white bg-opacity-90 p-4 rounded-lg shadow-lg z-10"
        style={{
          top: '34vh',
          left: '63vw',
          maxWidth: '300px',
        }}
      >
        <h2 className="text-xl font-bold mb-2">AI Commentary</h2>
        <p className="text-sm">{aiCommentary}</p>
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Difficulty: {aiDifficulty}/10</h3>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${aiDifficulty * 10}%` }}
            ></div>
          </div>
        </div>
        <div className="mt-2">
          <p>Icons: {iconCount}</p>
          <p>Timer: {useTimer ? 'On' : 'Off'}</p>
        </div>
      </div>

      {/* Bender Image */}
      <div
        className="absolute z-10"
        style={{
          bottom: '2vh',
          right: '12vw',
        }}
      >
        <Image
          src={benderImage}
          alt="Bender"
          width={350}
          height={350}
          style={{ height: 'auto', width: '100%' }}
        />
      </div>

      {/* Sound Toggle Button */}
      <button
        className="bg-yellow-500 text-white p-2 rounded-full"
        onClick={() => setIsSoundEnabled(!isSoundEnabled)}
      >
        {isSoundEnabled ? '🔊' : '🔇'}
      </button>
    </div>
  );
}