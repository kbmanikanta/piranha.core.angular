import { HttpClient } from '@angular/common/http';
import { Injectable } from "@angular/core";
import { Meta, Title } from "@angular/platform-browser";
import { NavigationStart, Router } from "@angular/router";
import { Observable, Subject } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class CmsService {

  private routeCache: any[] = [];

  public static url: string = "api/cms";

  sitemapChanged: Subject<any> = new Subject<any>();
  modelChanged: Subject<any> = new Subject<any>();
  loadingChanged: Subject<boolean> = new Subject<boolean>();
  private errors: any;
  private sitemap: any;
  private subSitemap: any;
  private model: any;
  private currentPage: string;

  constructor(private http: HttpClient, private router: Router, private meta: Meta, private title: Title) {
    this.currentPage = router.url;

    router.events.subscribe((val) => {
      if (val instanceof NavigationStart) {
        this.currentPage = val.url;
        this.getModel();
      }
    });
  }

  private getModel() {
    if (!this.sitemap || !this.currentPage) {
      return;
    }

    let route = this.getRouteId(this.sitemap, this.currentPage);

    if (!route) {
      //timeout is to allow the view to load before sending the model from cache
      setTimeout(() => {
        this.modelChanged.next({ altMunu: true });
        this.loadingChanged.next(false);
      }, 50);
      return;
    }

    this.subSitemap = route.Items;
    let model = this.routeCache.find(model => {
      return model.Id === route.Id;
    });
    if (model) {
      //timeout is to allow the view to load before sending the model from cache
      setTimeout(() => {
        this.onSuccessfulGetModel(model, true);
        this.loadingChanged.next(false);
      }, 50);
    } else if (route.PageTypeName === "Start page") {
      this.getStartPage(route.Id)
        .subscribe((result) => this.onSuccessfulGetModel(result, false, false),
          (errors: any) => this.onUnsuccessful(errors),
          () => this.loadingChanged.next(false));
    } else if (route.PageTypeName === "Blog Archive") {
      this.getArchive(route.Id)
        .subscribe((result) => this.onSuccessfulGetModel(result, false, false),
          (errors: any) => this.onUnsuccessful(errors),
          () => this.loadingChanged.next(false));
    } else if (route.PageTypeName === "BlogPost") {
      this.getPost(route.Id)
        .subscribe((result) => this.onSuccessfulGetModel(result, false, true),
          (errors: any) => this.onUnsuccessful(errors),
          () => this.loadingChanged.next(false));
    } else if (route.PageTypeName === "Standard page") {
      this.getPage(route.Id)
        .subscribe((result) => this.onSuccessfulGetModel(result, false, true),
          (errors: any) => this.onUnsuccessful(errors),
          () => this.loadingChanged.next(false));
    } else if (route.PageTypeName === "Category") {
      this.getArchive(route.ParentId, null, null, null, route.Id)
        .subscribe((result) => this.onSuccessfulGetModel(result, false, false),
          (errors: any) => this.onUnsuccessful(errors),
          () => this.loadingChanged.next(false));
    } else if (route.PageTypeName === "Tag") {
      this.getArchive(route.ParentId, null, null, null, null, route.Id)
        .subscribe((result) => this.onSuccessfulGetModel(result, false, false),
          (errors: any) => this.onUnsuccessful(errors),
          () => this.loadingChanged.next(false));
    }
  }

  private getRouteId(routes: any, route: string): any {
    for (let route of routes) {
      if (route.Permalink === this.currentPage)
        return route;
      if (route.Items.length >= 0) {
        let id = this.getRouteId(route.Items, route);
        if (id != null)
          return id;
      }
    }
    return null;
  }

  public onSuccessfulGetSiteMap(result): void {
    this.sitemap = result;
    this.sitemapChanged.next(this.sitemap);
  }

  public onSuccessfulGetModel(result: any, fronCache: boolean, altMunu: boolean = null) {
    if (!fronCache) {
      this.routeCache.push(result);
    }

    if (altMunu != null) {
      result.altMunu = altMunu;
    }

    if (result.RedirectUrl && result.RedirectUrl !== "") {
      document.location.replace(result.RedirectUrl);
    } else {
      this.model = result;
      this.modelChanged.next(this.model);
      //, this.currentPage, this.subSitemap]

      this.title.setTitle(this.model.Title);

      this.meta.updateTag({ name: "keywords", content: this.model.MetaKeywords.length > 0 ? this.model.MetaKeywords : "" });

      this.meta.updateTag({ name: "og:title", content: this.model.Title });

      this.meta.updateTag({ name: "description", content: this.model.MetaDescription.length > 0 ? this.model.MetaDescription : "" });

      this.meta.updateTag({ name: "og:description", content: this.model.MetaDescription.length > 0 ? this.model.MetaDescription : "" });
    }
  }

  private onUnsuccessful(result: any) {
    //this.errors = errors;
  }

  public getSiteMap(id: string = null): Observable<any> {
    const url: string = `${CmsService.url}/sitemap?id=${id}`;
    return this.http.get(url)
      .pipe(catchError(this.handleError));
  }

  private getArchive(id: string, year: number = null, month: number = null, page: number = null, category: string = null, tag: string = null): Observable<any> {
    const url: string = `${CmsService.url}/archive?id=${id}&year=${year}&month=${month}&page=${page}&category=${category}&tag=${tag}`;
    return this.http.get(url)
      .pipe(catchError(this.handleError));
  }

  private getPage(id: string): Observable<any> {
    const url: string = `${CmsService.url}/page?id=${id}`;
    return this.http.get(url)
      .pipe(catchError(this.handleError));
  }

  private getPost(id: string): Observable<any> {
    const url: string = `${CmsService.url}/post?id=${id}`;
    return this.http.get(url)
      .pipe(catchError(this.handleError));
  }

  private getStartPage(id: string): Observable<any> {
    const url: string = `${CmsService.url}/startpage?id=${id}`;
    return this.http.get(url)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any): any {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      console.error(`Backend returned code ${error.status}, body was: ${error.error}`);
    }
    // return an observable with a user-facing error message
    //throw error for angular 5
    Observable.throw(new Error('Something bad happened; please try again later.'));

    //throw error for angular 6
    //return throwError(
    //  'Something bad happened; please try again later.');
  }
}
