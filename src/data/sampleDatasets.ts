export interface SampleDatasetMeta {
  id: string;
  name: string;
  filename: string;
  task: string;
  description: string;
  rowsCount: number;
  colsCount: number;
  knownIssues: string[];
  csv: string;
}

export const SAMPLE_DATASETS: SampleDatasetMeta[] = [
  {
    id: 'tehran-housing',
    name: 'Tehran Apartment Market (housePrice.csv)',
    filename: 'housePrice.csv',
    task: 'Regression (Property Price Prediction)',
    description: 'Tehran apartment transaction records with Area, Room, amenities, neighborhood Address, and sale prices in IRR and USD. Includes concentrated Room distribution (IQR = 0), missing Addresses, severe Area leverage outliers, duplicate records, and collinear price measurements.',
    rowsCount: 35,
    colsCount: 8,
    knownIssues: [
      'Missing values in Address (apartments with unknown neighborhood)',
      'Concentrated distribution in Room (Q1=2, Median=2, Q3=2, IQR=0)',
      'Severe Area entry error (1,000,000,000 m² typo)',
      'Exact duplicate apartment listing rows',
      'Collinear dual measurements: Price (IRR) & Price(USD) (r = 1.00)'
    ],
    csv: `Area,Room,Parking,Warehouse,Elevator,Address,Price,Price(USD)
63,1,True,True,True,Shahran,1850000000,61666.67
60,1,True,True,True,Shahran,1850000000,61666.67
79,2,True,True,True,Pardis,550000000,18333.33
95,2,True,True,True,Shahrake Gharb,9025000000,300833.33
123,2,True,True,True,Shahrake Gharb,7000000000,233333.33
105,2,True,True,True,Shahrake Gharb,7000000000,233333.33
105,2,True,True,True,Shahrake Gharb,7000000000,233333.33
145,2,True,True,True,Saadat Abad,12500000000,416666.67
100,2,True,True,True,Punak,5000000000,166666.67
85,2,True,True,True,,4200000000,140000.00
110,2,True,True,True,Punak,5800000000,193333.33
65,2,True,True,True,West Ferdows,3200000000,106666.67
70,2,True,True,True,West Ferdows,3500000000,116666.67
120,2,True,True,True,Gheitarieh,9600000000,320000.00
88,2,True,True,True,Ostad Moein,2900000000,96666.67
130,2,True,True,True,Gheitarieh,11000000000,366666.67
75,2,True,True,True,Pardis,600000000,20000.00
82,2,True,True,True,,3900000000,130000.00
1000000000,2,True,True,True,Abazar,4500000000,150000.00
115,2,True,True,True,Niavaran,16000000000,533333.33
90,2,True,True,True,Punak,4800000000,160000.00
92,2,True,True,True,Shahran,3700000000,123333.33
108,2,True,True,True,West Ferdows,6200000000,206666.67
73,2,True,True,True,Pardis,580000000,19333.33
180,3,True,True,True,Saadat Abad,19500000000,650000.00
200,3,True,True,True,Zaferanieh,28000000000,933333.33
160,3,True,True,True,Niavaran,22000000000,733333.33
210,3,True,True,True,Elahieh,35000000000,1166666.67
150,3,True,True,True,Pasdaran,14500000000,483333.33
80,2,True,True,True,Amir Abad,5200000000,173333.33
68,2,True,True,True,West Ferdows,3300000000,110000.00
125,2,True,True,True,Yousef Abad,8800000000,293333.33
77,2,True,True,True,Punak,4100000000,136666.67
102,2,True,True,True,Shahran,4900000000,163333.33
102,2,True,True,True,Shahran,4900000000,163333.33`
  },
  {
    id: 'housing-regression',
    name: 'Real Estate & Housing Valuation',
    filename: 'housing_market_train.csv',
    task: 'Regression (Price Prediction)',
    description: 'Property transaction records with physical attributes, location zipcodes, and sale prices. Contains missing measurements, duplicate listings, and extreme price outliers.',
    rowsCount: 28,
    colsCount: 9,
    knownIssues: [
      'Missing values in bedrooms and lot_size',
      'Duplicate listing records (e.g. ID #104 & #112)',
      'Extreme price outlier ($12,500,000 for modest home)',
      'Empty inspection_notes column (100% missing)',
      'Inconsistent text casing in neighborhood'
    ],
    csv: `property_id,sqft_living,bedrooms,bathrooms,lot_size,year_built,zipcode,price,inspection_notes
101,1850,3,2.0,5200,1998,98001,425000,
102,2400,4,2.5,7400,2005,98002,590000,
103,1250,2,1.0,,1985,98001,310000,
104,3100,4,3.0,9100,2012,98004,875000,
104,3100,4,3.0,9100,2012,98004,875000,
105,950,1,1.0,3800,1974,98003,245000,
106,2150,,2.0,6100,1995,98001,480000,
107,1750,3,1.5,4900,1988,98002,395000,
108,2800,4,2.5,8200,2010,98004,780000,
109,1450,3,1.5,,1992,98003,340000,
110,3600,5,3.5,11500,2018,98004,1150000,
111,2100,3,2.0,6500,2001,98001,460000,
112,1900,3,2.0,5400,1999,98002,430000,
112,1900,3,2.0,5400,1999,98002,430000,
113,1100,2,1.0,4200,1980,98003,290000,
114,2950,4,3.0,8900,2014,98004,840000,
115,1600,3,2.0,5000,1990,98001,375000,
116,2250,,2.5,6800,2003,98002,510000,
117,1350,2,1.5,4600,1986,98003,325000,
118,3400,5,3.0,10200,2016,98004,980000,
119,1950,3,2.0,5600,1997,98001,440000,
120,2550,4,2.5,7800,2008,98002,620000,
121,1200,2,1.0,,1982,98003,305000,
122,3200,4,3.0,9400,2013,98004,890000,
123,1500,3,1.5,4800,1991,98001,360000,
124,2050,3,2.0,6200,2000,98002,470000,
125,1700,3,2.0,5100,1993,98003,385000,
126,1600,3,2.0,5000,1996,98001,12500000,`
  },
  {
    id: 'customer-churn',
    name: 'Customer Subscription & Churn',
    filename: 'telecom_churn_raw.csv',
    task: 'Classification (Churn Prediction)',
    description: 'Monthly telecom customer account metrics, billing methods, and churn outcomes. Features unformatted charges, duplicate accounts, and missing values.',
    rowsCount: 26,
    colsCount: 8,
    knownIssues: [
      'Missing total_charges for new customers',
      'Duplicate customer accounts (ID #C08)',
      'Negative support_calls data entry error (-3)',
      'Empty secondary_email column',
      'Inconsistent boolean churn labels'
    ],
    csv: `customer_id,tenure_months,monthly_charges,total_charges,contract_type,support_calls,churn,secondary_email
C01,12,65.5,786.0,Month-to-month,2,No,
C02,34,89.2,3032.8,One year,1,No,
C03,3,45.0,135.0,Month-to-month,5,Yes,
C04,60,105.4,6324.0,Two year,0,No,
C05,1,70.2,,Month-to-month,3,Yes,
C06,24,55.8,1339.2,One year,1,No,
C07,8,80.1,640.8,Month-to-month,4,Yes,
C08,45,95.0,4275.0,Two year,0,No,
C08,45,95.0,4275.0,Two year,0,No,
C09,18,60.0,1080.0,Month-to-month,2,No,
C10,2,75.3,,Month-to-month,6,Yes,
C11,36,85.0,3060.0,One year,1,No,
C12,72,110.0,7920.0,Two year,0,No,
C13,6,50.4,302.4,Month-to-month,3,Yes,
C14,28,92.5,2590.0,One year,2,No,
C15,15,68.0,1020.0,Month-to-month,-3,No,
C16,48,102.0,4896.0,Two year,0,No,
C17,4,58.0,232.0,Month-to-month,4,Yes,
C18,22,79.5,1749.0,One year,1,No,
C19,1,40.0,,Month-to-month,2,Yes,
C20,55,98.0,5390.0,Two year,0,No,
C21,9,72.0,648.0,Month-to-month,3,Yes,
C22,30,88.0,2640.0,One year,1,No,
C23,65,108.0,7020.0,Two year,0,No,
C24,14,64.0,896.0,Month-to-month,2,No,
C25,40,91.0,3640.0,One year,1,No,`
  },
  {
    id: 'student-performance',
    name: 'Student Exam & Study Performance',
    filename: 'student_academic_records.csv',
    task: 'Predictive Modeling (Grade Outcomes)',
    description: 'Weekly study habits, attendance percentage, and exam scores for undergraduate students. Contains missing attendance, impossible exam scores (>100), and duplicates.',
    rowsCount: 24,
    colsCount: 8,
    knownIssues: [
      'Missing values in study_hours_weekly',
      'Duplicate records for Student #S105',
      'Outlier exam score (185/100 typing typo)',
      'Empty advisor_notes column',
      'Attendance formatted with and without percent signs'
    ],
    csv: `student_id,gender,study_hours,attendance_pct,midterm_score,final_score,passed,advisor_notes
S101,F,14.5,92,84,88,True,
S102,M,8.0,75,65,70,True,
S103,F,,88,78,82,True,
S104,M,4.5,60,45,52,False,
S105,F,18.0,96,92,95,True,
S105,F,18.0,96,92,95,True,
S106,M,11.0,82,72,74,True,
S107,F,6.5,,58,61,False,
S108,M,16.0,94,89,91,True,
S109,F,,70,62,68,True,
S110,M,12.5,85,76,80,True,
S111,F,20.0,98,95,185,True,
S112,M,5.0,55,42,48,False,
S113,F,13.0,89,81,85,True,
S114,M,,78,69,72,True,
S115,F,15.5,93,87,89,True,
S116,M,9.0,80,70,73,True,
S117,F,7.0,,60,64,False,
S118,M,17.5,95,90,93,True,
S119,F,10.0,84,74,77,True,
S120,M,3.0,48,35,40,False,
S121,F,19.0,97,94,96,True,
S122,M,13.5,86,79,81,True,
S123,F,8.5,76,66,69,True,`
  }
];
