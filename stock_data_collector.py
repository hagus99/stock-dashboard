import json
import time
from datetime import datetime, timedelta
import pandas as pd
from pykrx import stock

def get_all_company_list():
    """
    KOSPI 및 KOSDAQ의 모든 상장 종목 코드와 이름을 가져와 저장합니다.
    (검색 기능을 위한 마스터 데이터 생성)
    """
    print("전체 종목 리스트(KOSPI, KOSDAQ)를 수집 중입니다... (약 1~2분 소요)")
    
    market_list = ["KOSPI", "KOSDAQ"]
    company_list = []
    
    # 기준일 (오늘)
    today = datetime.now().strftime("%Y%m%d")

    for market in market_list:
        try:
            # 해당 시장의 전체 티커 리스트 가져오기
            tickers = stock.get_market_ticker_list(today, market=market)
            
            # 티커별 종목명 매핑
            for ticker in tickers:
                name = stock.get_market_ticker_name(ticker)
                company_list.append({
                    "code": ticker,
                    "name": name,
                    "market": market
                })
        except Exception as e:
            print(f"{market} 리스트 수집 중 에러: {e}")

    # JSON 저장
    with open("company_list.json", 'w', encoding='utf-8') as f:
        json.dump(company_list, f, ensure_ascii=False, indent=None) # 용량 줄이기 위해 indent 제거
        
    print(f"✅ 전체 종목 리스트 수집 완료: {len(company_list)}개 저장됨 (company_list.json)")
    return company_list

def fetch_single_stock(ticker, days=365):
    """개별 종목 수급/주가 데이터 수집"""
    end_date = datetime.now().strftime("%Y%m%d")
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y%m%d")
    
    print(f"   [{ticker}] 데이터 수집 중 ({start_date}~{end_date})...")

    try:
        # 1. 주가 (OHLCV)
        df_ohlcv = stock.get_market_ohlcv(start_date, end_date, ticker)
        time.sleep(0.2) 

        # 2. 거래량 (수급) - 호환성 고려 함수
        df_investor = stock.get_market_trading_volume_by_date(start_date, end_date, ticker)
        time.sleep(0.2)

        if df_investor.empty:
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
    # 1. 전체 종목 리스트 생성 (검색용)
    # 매번 실행할 필요는 없지만, 신규 상장을 위해 포함
    get_all_company_list()

    # 2. 차트 데이터 수집 (상위 관심 종목만)
    # 모든 종목(2600개)을 매일 수집하면 시간이 너무 오래 걸리므로, 
    # 예시로 시가총액 상위 5개(삼성, 하이닉스, LG엔솔, 바하, 현대차) + 포스코만 수집합니다.
    # 필요하면 여기에 종목 코드를 추가하세요.
    target_tickers = {
        "005930": "삼성전자",
        "000660": "SK하이닉스",
        "373220": "LG에너지솔루션",
        "207940": "삼성바이오로직스",
        "005380": "현대차",
        "005490": "POSCO홀딩스"
    }
    
    full_data = {}
    print("\n차트 데이터 수집 시작 (주요 종목)...")
    
    for code, name in target_tickers.items():
        data = fetch_single_stock(code)
        if data:
            full_data[code] = data # key를 종목코드로 저장 (중요)
            print(f"   ✅ {name}({code}) 완료")
    
    with open("stock_data.json", 'w', encoding='utf-8') as f:
        json.dump(full_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✨ 모든 작업 완료. 'company_list.json'과 'stock_data.json'을 public 폴더로 이동하세요.")

if __name__ == "__main__":
    update_data()