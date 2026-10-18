"""
Stage 1: Data Foundation
Load and prepare the engineered dataset
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib
from camatis.config import *

class DataLoader:
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoders = {}
        
    def load_data(self):
        """Load train and test datasets"""
        print("Loading datasets...")
        train_df = pd.read_csv(TRAIN_FILE)
        test_df = pd.read_csv(TEST_FILE)
        
        print(f"Train shape: {train_df.shape}")
        print(f"Test shape: {test_df.shape}")
        
        return train_df, test_df
    
    def prepare_features(self, train_df, test_df):
        """Prepare feature matrices and target variables"""
        if 'route_id' not in train_df.columns:
            train_df = train_df.copy()
            train_df['route_id'] = train_df.index.astype(str)

        if 'route_id' not in test_df.columns:
            test_df = test_df.copy()
            test_df['route_id'] = test_df.index.astype(str)

        # Encode categorical variables if present
        '''for col in ['bus_id', 'utilization_status']:
            if col in train_df.columns and col in test_df.columns:
                le = LabelEncoder()
                train_df[f'{col}_encoded'] = le.fit_transform(train_df[col].astype(str))
                test_df[f'{col}_encoded'] = le.transform(test_df[col].astype(str))
                self.label_encoders[col] = le'''


        # Always encode bus_id because model expects it
        if 'bus_id' in train_df.columns and 'bus_id' in test_df.columns:
            le_bus = LabelEncoder()
            train_df['bus_id_encoded'] = le_bus.fit_transform(train_df['bus_id'].astype(str))
            test_df['bus_id_encoded'] = le_bus.transform(test_df['bus_id'].astype(str))
            self.label_encoders['bus_id'] = le_bus

        # Encode utilization_status if present
        if 'utilization_status' in train_df.columns and 'utilization_status' in test_df.columns:
            le_util = LabelEncoder()
            train_df['utilization_status_encoded'] = le_util.fit_transform(train_df['utilization_status'].astype(str))
            test_df['utilization_status_encoded'] = le_util.transform(test_df['utilization_status'].astype(str))
            self.label_encoders['utilization_status'] = le_util

        # Encode route_id because the model was trained with it
        if 'route_id' in train_df.columns:
            le_route = LabelEncoder()
            train_df['route_id_encoded'] = le_route.fit_transform(train_df['route_id'].astype(str))

            if 'route_id' in test_df.columns:
                test_df['route_id_encoded'] = le_route.transform(test_df['route_id'].astype(str))
            else:
                test_df['route_id_encoded'] = 0

            self.label_encoders['route_id'] = le_route

            
        # Select all numeric features
        feature_cols = (
        CAUSAL_FEATURES +
        TEMPORAL_FEATURES +
        SPATIAL_FEATURES +
        OPERATIONAL_FEATURES +
        ['bus_id_encoded','route_id_encoded']
        )
        '''if 'bus_id_encoded' in train_df.columns and 'bus_id_encoded' in test_df.columns:
            feature_cols.append('bus_id_encoded')'''

        # Use only columns that exist to avoid KeyError
        available_feature_cols = [c for c in feature_cols if c in train_df.columns and c in test_df.columns]
        missing_features = [c for c in feature_cols if c not in available_feature_cols]
        if missing_features:
            print(f"⚠️ Missing selected features in dataset: {missing_features}")

        feature_cols = available_feature_cols
        
        # Remove duplicates
        feature_cols = list(dict.fromkeys(feature_cols))
        
        if not feature_cols:
            raise ValueError("No matching features found in train/test datasets. Check preprocessing.")

        X_train = train_df[feature_cols].values
        X_test = test_df[feature_cols].values
        
        # Extract targets
        y_train = {
            'passenger_demand': train_df['passenger_demand'].values,
            'load_factor': train_df['load_factor'].values,
            'utilization_encoded': train_df['utilization_encoded'].values
        }
        
        y_test = {
            'passenger_demand': test_df['passenger_demand'].values,
            'load_factor': test_df['load_factor'].values,
            'utilization_encoded': test_df['utilization_encoded'].values
        }
        
        # Normalize features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        print(f"Feature matrix shape: {X_train_scaled.shape}")
        print(f"Number of features: {len(feature_cols)}")

        print("Feature columns used:", feature_cols)
        print("Feature count:", len(feature_cols))
        
        return X_train_scaled, X_test_scaled, y_train, y_test, feature_cols
    
    def save_preprocessor(self):
        """Save scaler and encoders"""
        joblib.dump(self.scaler, f"{MODELS_DIR}/scaler.pkl")
        joblib.dump(self.label_encoders, f"{MODELS_DIR}/label_encoders.pkl")
        print("Preprocessors saved.")
