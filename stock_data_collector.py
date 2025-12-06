import json
import time
from datetime import datetime, timedelta
import pandas as pd
from pykrx import stock

def get_latest_business_day():
    """
    오늘이 주말(토/일)이면 가장 최근 금요일 날짜를 반환합니다.
    """
    now = datetime.now()
    # weekday(): 0(월) ~ 6(일)
    if now.weekday() == 5: # 토요일
        return (now - timedelta(days=1)).strftime("%Y%m%d")
    elif now.weekday() == 6: # 일요일
        return (now - timedelta(days=2)).strftime("%Y%m%d")
    return now.strftime("%Y%m%d")

def get_all_company_list():
    print("전체 종목 리스트(KOSPI, KOSDAQ)를 수집 중입니다... (약 1~2분 소요)")
    company_list = []
    
    # 종목 리스트는 오늘 날짜 기준(주말이어도 조회 가능)
    today = datetime.now().strftime("%Y%m%d")

    for market in ["KOSPI", "KOSDAQ"]:
        try:
            tickers = stock.get_market_ticker_list(today, market=market)
            for ticker in tickers:
                name = stock.get_market_ticker_name(ticker)
                company_list.append({"code": ticker, "name": name, "market": market})
        except Exception as e:
            print(f"{market} 리스트 수집 에러: {e}")

    with open("company_list.json", 'w', encoding='utf-8') as f:
        json.dump(company_list, f, ensure_ascii=False, indent=None)
    print(f"✅ 종목 리스트 완료: {len(company_list)}개")

def fetch_single_stock(ticker, days=365):
    # [핵심 수정] 종료일을 '오늘'이 아닌 '최근 영업일(평일)'로 설정
    end_date = get_latest_business_day()
    start_date = (datetime.strptime(end_date, "%Y%m%d") - timedelta(days=days)).strftime("%Y%m%d")
    
    print(f"   [{ticker}] 수집 기간: {start_date} ~ {end_date}")

    try:
        # 1. 주가 (OHLCV)
        df_ohlcv = stock.get_market_ohlcv(start_date, end_date, ticker)
        time.sleep(0.3) 

        # 2. 거래량 (수급)
        df_investor = stock.get_market_trading_volume_by_date(start_date, end_date, ticker)
        time.sleep(0.3)

        if df_investor.empty:
            print(f"   ⚠️ 데이터 없음")
            return []

        # 3. 전처리
        rename_map = {'종가': 'price', '개인': 'personal', '외국인합계': 'foreigner', '기관합계': 'institution'}
        df_ohlcv = df_ohlcv.rename(columns=rename_map)
        df_investor = df_investor.rename(columns=rename_map)
        
        if 'foreigner' not in df_investor.columns and '외국인' in df_investor.columns:
             df_investor = df_investor.rename(columns={'외국인': 'foreigner'})

        req_cols = ['personal', 'foreigner', 'institution']
        for col in req_cols:
            if col not in df_investor.columns: df_investor[col] = 0 

        merged_df = pd.concat([df_ohlcv['price'], df_investor[req_cols]], axis=1).dropna()

        # 4. JSON 변환
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
        print(f"   ❌ Error: {e}")
        return []

def update_data():
    # 1. 종목 리스트 생성 (필요시 주석 해제하여 실행)
    get_all_company_list()

    # 2. 차트 데이터 수집
    target_tickers = {
        "005930": "삼성전자",
        "000660": "SK하이닉스",
        "373220": "LG에너지솔루션",
        "207940": "삼성바이오로직스",
        "005380": "현대차",
        "005490": "POSCO홀딩스"
    }
    
    full_data = {}
    print("\n차트 데이터 수집 시작 (주말 보정 적용)...")
    
    for code, name in target_tickers.items():
        data = fetch_single_stock(code)
        if data:
            full_data[code] = data
            print(f"   ✅ {name} 완료 ({len(data)}일치)")
    
    with open("stock_data.json", 'w', encoding='utf-8') as f:
        json.dump(full_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✨ 'stock_data.json' 저장 완료. public 폴더로 이동해주세요.")

if __name__ == "__main__":
    update_data()