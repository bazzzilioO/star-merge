from aiogram import Bot, Dispatcher, types, executor
from aiogram.types import WebAppInfo, ReplyKeyboardMarkup, KeyboardButton
import database, game_logic

API_TOKEN = 'ВАШ_BOT_TOKEN'
bot = Bot(token=API_TOKEN)
dp = Dispatcher(bot)

@dp.message_handler(commands=['start'])
async def cmd_start(message: types.Message):
    keyboard = ReplyKeyboardMarkup(resize_keyboard=True)
    webapp_url = '<YOUR_FRONTEND_URL>'
    button = KeyboardButton('▶️ Play Star Merge', web_app=WebAppInfo(url=webapp_url))
    keyboard.add(button)
    await message.answer("Добро пожаловать в Star Merge!", reply_markup=keyboard)

@dp.message_handler()
async def handle_webapp_data(message: types.Message):
    data = message.web_app_data.data
    await message.answer('Получены данные: ' + data)

if __name__ == '__main__':
    database.init_db()
    executor.start_polling(dp, skip_updates=True)