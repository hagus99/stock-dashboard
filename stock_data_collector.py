import json
import time
from datetime import datetime, timedelta
import pandas as pd
from pykrx import stock

def get_latest_business_day():
    """
    오늘 날짜를 기준으로 가장 최근 영업일(평일)을 반환합니다.
    (토요일 -> 금요일, 일요일 -> 금요일)
    """
    now = datetime.now()
    
    # 0:월 ~ 4:금, 5:토, 6:일
    if now.weekday() == 5: # 토요일 -> 금요일로 설정
        return (now - timedelta(days=1)).strftime("%Y%m%d")
    elif now.weekday() == 6: # 일요일 -> 금요일로 설정
        return (now - timedelta(days=2)).strftime("%Y%m%d")
    
    # 평일이면 오늘 날짜 사용
    return now.strftime("%Y%m%d")

def get_all_company_list():
    """
    KOSPI, KOSDAQ 전 종목 리스트 수집
    (주말 이슈 방지를 위해 최근 영업일 기준 조회)
    """
    target_date = get_latest_business_day()
    print(f"전체 종목 리스트 수집 중... (기준일: {target_date})")
    
    company_list = []
    
    for market in ["KOSPI", "KOSDAQ"]:
        try:
            # 기준일자로 티커 리스트 조회
            tickers = stock.get_market_ticker_list(target_date, market=market)
            time.sleep(0.5) # 차단 방지 대기
            
            print(f"   - {market} 종목 수: {len(tickers)}개")
            
            for ticker in tickers:
                name = stock.get_market_ticker_name(ticker)
                company_list.append({
                    "code": ticker,
                    "name": name,
                    "market": market
                })
                
        except Exception as e:
            print(f"   ❌ {market} 리스트 수집 에러: {e}")

    # JSON 저장
    if len(company_list) > 0:
        with open("company_list.json", 'w', encoding='utf-8') as f:
            json.dump(company_list, f, ensure_ascii=False, indent=None)
        print(f"✅ 'company_list.json' 저장 완료 (총 {len(company_list)}개 종목)")
    else:
        print("⚠️ 종목 리스트가 비어있습니다. 저장을 건너뜁니다.")

    return company_list

def fetch_single_stock(ticker, days=365):
    # 1. 기준 종료일 설정
    end_date_str = get_latest_business_day()
    
    # 시작일 계산 (1년 전)
    end_dt = datetime.strptime(end_date_str, "%Y%m%d")
    start_date_str = (end_dt - timedelta(days=days)).strftime("%Y%m%d")
    
    print(f"   [{ticker}] 수집 기간: {start_date_str} ~ {end_date_str}")

    try:
        # 2. 주가 데이터 (OHLCV) 조회
        df_ohlcv = stock.get_market_ohlcv(start_date_str, end_date_str, ticker)
        time.sleep(0.3)

        # 3. 투자자별 거래량(Volume) 조회
        df_investor = stock.get_market_trading_volume_by_date(start_date_str, end_date_str, ticker)
        time.sleep(0.3)

        if df_investor is None or df_investor.empty:
            print(f"   ⚠️ 데이터 수집 실패: 해당 기간에 거래 데이터가 없습니다.")
            return []

        # 4. 데이터 전처리 및 병합
        rename_map = {
            '종가': 'price', 
            '개인': 'personal', 
            '외국인합계': 'foreigner',
            '외국인': 'foreigner',
            '기관합계': 'institution'
        }
        
        df_ohlcv = df_ohlcv.rename(columns=rename_map)
        df_investor = df_investor.rename(columns=rename_map)

        # 필요한 컬럼만 추출
        req_cols = ['personal', 'foreigner', 'institution']
        for col in req_cols:
            if col not in df_investor.columns: 
                df_investor[col] = 0

        # 병합
        merged_df = pd.concat([df_ohlcv['price'], df_investor[req_cols]], axis=1).dropna()

        # 5. JSON 구조로 변환
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

def update_data():
    print(f"\n=== 데이터 수집기 시작 ({datetime.now()}) ===")
    
    # 1. 전체 종목 리스트 생성 (반드시 실행되어야 함)
    get_all_company_list()

    # 2. 타겟 종목 차트 데이터 수집
    target_tickers = {
        "005930": "삼성전자",
        "000660": "SK하이닉스",
        "373220": "LG에너지솔루션",
        "005380": "현대차",
        "005490": "POSCO홀딩스"
    }
    
    full_data = {}
    print("\n--- 주요 종목 차트 데이터 수집 ---")
    
    for code, name in target_tickers.items():
        data = fetch_single_stock(code)
        if data:
            full_data[code] = data
            print(f"   ✅ {name} 수집 완료 ({len(data)}건)")
        else:
            print(f"   ❌ {name} 수집 실패")
    
    # JSON 파일 저장
    with open("stock_data.json", 'w', encoding='utf-8') as f:
        json.dump(full_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✨ 모든 작업 완료.")
    print(f"📂 'company_list.json' (약 2600개 종목) 확인 필요")
    print(f"📂 'stock_data.json' 확인 필요")
    print(f"🚀 두 파일을 'public' 폴더로 이동 후 Push 하세요!")

if __name__ == "__main__":
    update_data()