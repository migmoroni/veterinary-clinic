export type AnalyticsChartTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger';

export interface AnalyticsChartDatum {
	key: string;
	label: string;
	value: number;
	percent?: number;
	tone?: AnalyticsChartTone;
	detail?: string;
}

export interface AnalyticsChartModel {
	data: AnalyticsChartDatum[];
	total: number;
	emptyLabel?: string;
}

export interface AnalyticsBarChartModel extends AnalyticsChartModel {
	orientation: 'horizontal' | 'vertical';
}

export interface AnalyticsDonutChartModel extends AnalyticsChartModel {
	centerLabel?: string;
	centerValue?: string;
}

export interface AnalyticsTrendChartPoint {
	key: string;
	label: string;
	value: number;
}

export interface AnalyticsTrendChartModel {
	data: AnalyticsTrendChartPoint[];
	total: number;
	emptyLabel?: string;
}
