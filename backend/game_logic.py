import random
from enum import Enum

class TileType(Enum):
    NORMAL = 1
    PHANTOM = 2  # "призрачная" плитка

class GameLogic:
    def __init__(self, size=5):
        self.size = size
        self.board = [[None for _ in range(size)] for _ in range(size)]
        self.score = 0
        self.moves = 0
        self.spawn_initial()

    def spawn_initial(self, count=3):
        for _ in range(count):
            self.spawn_tile()

    def spawn_tile(self):
        empty = [(i, j) for i in range(self.size) for j in range(self.size) if self.board[i][j] is None]
        if not empty:
            return
        i, j = random.choice(empty)
        # Шанс появления призрачной плитки 10%
        ttype = TileType.PHANTOM if random.random() < 0.1 else TileType.NORMAL
        value = 1  # уровень 1 (звезда первой категории)
        self.board[i][j] = {'value': value, 'type': ttype, 'turns': 5 if ttype == TileType.PHANTOM else None}

    def get_neighbors(self, i, j):
        dirs = [(1,0),(-1,0),(0,1),(0,-1)]
        for di, dj in dirs:
            ni, nj = i+di, j+dj
            if 0 <= ni < self.size and 0 <= nj < self.size:
                yield ni, nj

    def flood_fill(self, i, j, visited=None):
        if visited is None:
            visited = set()
        base = self.board[i][j]
        if base is None:
            return []
        cluster = [(i, j)]
        visited.add((i, j))
        for ni, nj in self.get_neighbors(i, j):
            if (ni, nj) not in visited and self.board[ni][nj] is not None:
                other = self.board[ni][nj]
                if other['value'] == base['value'] and other['type'] == base['type']:
                    cluster += self.flood_fill(ni, nj, visited)
        return cluster

    def merge_at(self, i, j):
        cluster = self.flood_fill(i, j)
        if len(cluster) < 3:
            return False
        # Удаляем все, кроме одной
        for ci, cj in cluster:
            self.board[ci][cj] = None
        # Обновляем центральную
        self.board[i][j] = {'value': cluster and self.board[i][j]['value'] + 1,
                            'type': TileType.NORMAL,
                            'turns': None}
        self.score += len(cluster) * 10
        self.moves += 1
        # Спавним новую
        self.spawn_tile()
        return True

    def decrement_phantoms(self):
        for i in range(self.size):
            for j in range(self.size):
                t = self.board[i][j]
                if t and t['type'] == TileType.PHANTOM:
                    t['turns'] -= 1
                    if t['turns'] <= 0:
                        self.board[i][j] = None

    def is_game_over(self):
        # Если нет пустых клеток и нет возможных кластеров
        for i in range(self.size):
            for j in range(self.size):
                if self.board[i][j] is None:
                    return False
                if len(self.flood_fill(i, j)) >= 3:
                    return False
        return True

    def to_dict(self):
        return {
            'board': self.board,
            'score': self.score,
            'moves': self.moves
        }