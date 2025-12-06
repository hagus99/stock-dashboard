from flask import Flask, jsonify
from flask_cors import CORS
import json
import time
from datetime import datetime, timedelta
import pandas as pd
from pykrx import stock

app = Flask(__name__)
CORS(app)

def get_latest_business_day():
    """
    오늘 날짜를 기준으로 가장 최근 영업일(평일)을 반환합니다.
    (토요일 -> 금요일, 일요일 -> 금요일)
    """
    now = datetime.now()
    if now.weekday() == 5:
        return (now - timedelta(days=1)).strftime("%Y%m%d")
    elif now.weekday() == 6:
        return (now - timedelta(days=2)).strftime("%Y%m%d")
    return now.strftime("%Y%m%d")

def fetch_single_stock(ticker, days=365):
    end_date_str = get_latest_business_day()
    end_dt = datetime.strptime(end_date_str, "%Y%m%d")
    start_date_str = (end_dt - timedelta(days=days)).strftime("%Y%m%d")

    try:
        df_ohlcv = stock.get_market_ohlcv(start_date_str, end_date_str, ticker)
        time.sleep(0.3)
        df_investor = stock.get_market_trading_volume_by_date(start_date_str, end_date_str, ticker)
        time.sleep(0.3)

        if df_investor is None or df_investor.empty:
            return []

        rename_map = {
            '종가': 'price', 
            '개인': 'personal', 
            '외국인합계': 'foreigner',
            '외국인': 'foreigner',
            '기관합계': 'institution'
        }
        
        df_ohlcv = df_ohlcv.rename(columns=rename_map)
        df_investor = df_investor.rename(columns=rename_map)

        req_cols = ['personal', 'foreigner', 'institution']
        for col in req_cols:
            if col not in df_investor.columns: 
                df_investor[col] = 0

        merged_df = pd.concat([df_ohlcv['price'], df_investor[req_cols]], axis=1).dropna()

        result_data = []
        cum_personal = 0
        cum_foreigner = 0
        cum_institution = 0

        for date, row in merged_df.iterrows():
            cum_personal += int(row['personal'])
            cum_foreigner += int(row['foreigner'])
            cum_institution += int(row['institution'])

            result_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "price": int(row['price']),
                "personal": int(row['personal']), 
                "foreigner": int(row['foreigner']),
                "institution": int(row['institution']),
                "cumPersonal": cum_personal,
                "cumForeigner": cum_foreigner,
                "cumInstitution": cum_institution
            })
        
        return result_data

    except Exception as e:
        print(f"   ❌ 오류 발생 ({ticker}): {e}")
        return []

@app.route('/api/stock/<code>', methods=['GET'])
def get_stock_data(code):
    data = fetch_single_stock(code)
    if data:
        return jsonify(data)
    else:
        return jsonify({"error": "Data not found"}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5001)
