
from aiogram import Bot, Dispatcher, types, executor

cat > main.py << 'EOF'
from aiogram import Bot, Dispatcher, types, executor
from aiogram.types import WebAppInfo, ReplyKeyboardMarkup, KeyboardButton
import database, game_logic
