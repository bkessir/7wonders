import { useState, useEffect, useCallback } from 'react';
import type { GameState, LobbyState, LocalIdentity } from './types/game';
import { getOrCreatePlayerId, subscribeLobby, subscribeGame, createGame, joinGame, startGameInFirebase } from './firebase/sync';
import { createInitialPlayerState, assignWonders, startGame as initGame } from './engine/game';
import { WONDERS } from './data/wonders';
import Lobby from './components/Lobby';
import WonderSelect from './components/WonderSelect';
import GameView from './components/GameView';
import ScoreBoard from './components/ScoreBoard';

export default function App() {
  const [identity, setIdentity] = useState<LocalIdentity | null>(null);
  const [gameCode, setGameCode] = useState<string>('');
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const id = getOrCreatePlayerId();
    const savedName = localStorage.getItem('sw_player_name') || '';
    setIdentity({ id, name: savedName });
  }, []);

  // Subscribe to lobby
  useEffect(() => {
    if (!gameCode) return;
    const unsub = subscribeLobby(gameCode, setLobby);
    return unsub;
  }, [gameCode]);

  // Subscribe to game state
  useEffect(() => {
    if (!gameCode) return;
    const unsub = subscribeGame(gameCode, (g) => {
      if (g) setGame(g);
    });
    return unsub;
  }, [gameCode]);

  const handleCreateGame = useCallback(async (name: string) => {
    if (!identity) return;
    localStorage.setItem('sw_player_name', name);
    setIdentity(prev => prev ? { ...prev, name } : null);
    const code = await createGame(identity.id, name);
    setGameCode(code);
  }, [identity]);

  const handleJoinGame = useCallback(async (code: string, name: string) => {
    if (!identity) return;
    localStorage.setItem('sw_player_name', name);
    setIdentity(prev => prev ? { ...prev, name } : null);
    const result = await joinGame(code.toUpperCase(), identity.id, name);
    if (result.success) {
      setGameCode(code.toUpperCase());
      setError('');
    } else {
      setError(result.error || 'Failed to join game.');
    }
  }, [identity]);

  const handleStartGame = useCallback(async () => {
    if (!lobby || !identity || lobby.hostId !== identity.id) return;
    const playerIds = Object.keys(lobby.players);
    const playerOrder = playerIds.sort((a, b) =>
      (lobby.players[a].joinedAt || 0) - (lobby.players[b].joinedAt || 0)
    );
    const wonders = assignWonders(playerOrder);
    const players: GameState['players'] = {};
    for (const pid of playerOrder) {
      players[pid] = {
        ...createInitialPlayerState(pid, lobby.players[pid].name),
        wonderId: wonders[pid],
        wonderSide: 'a',
      };
    }
    const gameState: GameState = {
      code: lobby.code,
      phase: 'wonder_select',
      age: 1,
      turn: 1,
      hostId: lobby.hostId,
      playerOrder,
      players,
      hands: {},
      discard: [],
      pendingActions: {},
      wonderAssignments: wonders,
    };
    const started = initGame(gameState);
    await startGameInFirebase(lobby.code, started);
  }, [lobby, identity]);

  if (!identity) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-yellow-400" />
      </div>
    );
  }

  function handlePlayAgain() {
    setGame(null);
    setGameCode('');
    setLobby(null);
    setError('');
  }

  // Show game in progress
  if (game && identity) {
    if (game.phase === 'end') {
      return <ScoreBoard game={game} playerId={identity.id} onPlayAgain={handlePlayAgain} />;
    }
    if (game.phase === 'wonder_select') {
      return (
        <WonderSelect
          game={game}
          playerId={identity.id}
          gameCode={gameCode}
        />
      );
    }
    return (
      <GameView
        game={game}
        playerId={identity.id}
        gameCode={gameCode}
      />
    );
  }

  // Show lobby
  if (lobby) {
    return (
      <Lobby
        lobby={lobby}
        playerId={identity.id}
        gameCode={gameCode}
        onStartGame={handleStartGame}
        error={error}
      />
    );
  }

  // Landing screen
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold gold-text mb-2" style={{fontFamily: 'Palatino, serif'}}>
          7 Wonders
        </h1>
        <p className="text-yellow-200/60 text-sm">Online Multiplayer · 3–7 Players</p>
      </div>
      <LandingForm
        defaultName={identity.name}
        onCreateGame={handleCreateGame}
        onJoinGame={handleJoinGame}
        error={error}
      />
    </div>
  );
}

function LandingForm({
  defaultName,
  onCreateGame,
  onJoinGame,
  error,
}: {
  defaultName: string;
  onCreateGame: (name: string) => void;
  onJoinGame: (code: string, name: string) => void;
  error: string;
}) {
  const [name, setName] = useState(defaultName);
  const [code, setCode] = useState('');
  const [tab, setTab] = useState<'create' | 'join'>('create');

  return (
    <div className="w-full max-w-sm">
      <div className="modal-panel">
        <div className="flex mb-4 gap-2">
          {(['create', 'join'] as const).map(t => (
            <button
              key={t}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${tab === t ? 'btn btn-gold' : 'btn btn-outline'}`}
              onClick={() => setTab(t)}
            >
              {t === 'create' ? 'New Game' : 'Join Game'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="section-header block mb-1">Your Name</label>
            <input
              className="game-input"
              placeholder="Enter your name..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
            />
          </div>

          {tab === 'join' && (
            <div>
              <label className="section-header block mb-1">Game Code</label>
              <input
                className="game-input uppercase tracking-widest text-center text-xl font-bold"
                placeholder="XXXXX"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                maxLength={5}
              />
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            className="btn btn-gold w-full py-3 text-base"
            disabled={!name.trim() || (tab === 'join' && code.length < 4)}
            onClick={() => {
              if (tab === 'create') onCreateGame(name.trim());
              else onJoinGame(code, name.trim());
            }}
          >
            {tab === 'create' ? '✦ Create Game' : '→ Join Game'}
          </button>
        </div>
      </div>
    </div>
  );
}
